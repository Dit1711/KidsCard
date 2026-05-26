package uz.kidscard.card.service

import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.card.api.dto.AllowanceScheduleDto
import uz.kidscard.card.api.dto.toDto
import uz.kidscard.card.domain.AllowanceFrequency
import uz.kidscard.card.domain.AllowanceSchedule
import uz.kidscard.card.repository.AllowanceScheduleRepository
import uz.kidscard.card.repository.KidsCardRepository
import uz.kidscard.common.exception.ResourceNotFoundException
import java.time.DayOfWeek
import java.time.Instant
import java.time.ZoneOffset
import java.time.ZonedDateTime
import java.time.temporal.TemporalAdjusters
import java.util.UUID

@Service
class AllowanceService(
    private val allowanceScheduleRepository: AllowanceScheduleRepository,
    private val kidsCardRepository: KidsCardRepository,
    private val outboxService: OutboxService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Transactional
    fun setAllowance(
        cardId: UUID,
        familyId: UUID,
        amountUzs: Long,
        frequency: AllowanceFrequency,
        dayOfWeek: Short?,
        dayOfMonth: Short?,
    ): AllowanceScheduleDto {
        val card = kidsCardRepository.findByIdAndFamilyId(cardId, familyId)
            ?: throw ResourceNotFoundException("KidsCard", cardId)

        // Deactivate existing active schedules
        val existing = allowanceScheduleRepository.findByCardIdAndActiveTrue(cardId)
        existing.forEach { schedule ->
            schedule.active = false
            schedule.updatedAt = Instant.now()
        }
        allowanceScheduleRepository.saveAll(existing)

        val nextRunAt = computeNextRunAt(frequency, dayOfWeek, dayOfMonth)

        val schedule = AllowanceSchedule(
            card = card,
            amountUzs = amountUzs,
            frequency = frequency,
            dayOfWeek = dayOfWeek,
            dayOfMonth = dayOfMonth,
            active = true,
            nextRunAt = nextRunAt,
        )

        val saved = allowanceScheduleRepository.save(schedule)
        log.debug("Allowance set: cardId={} amount={} frequency={} nextRunAt={}", cardId, amountUzs, frequency, nextRunAt)

        return saved.toDto()
    }

    @Transactional(readOnly = true)
    fun getActiveAllowance(cardId: UUID): AllowanceScheduleDto? =
        allowanceScheduleRepository.findByCardIdAndActiveTrue(cardId).firstOrNull()?.toDto()

    @Scheduled(fixedDelay = 60000)
    @Transactional
    fun processAllowances() {
        val now = Instant.now()
        val due = allowanceScheduleRepository.findByNextRunAtBeforeAndActiveTrue(now)
        if (due.isEmpty()) return

        log.debug("Processing {} due allowance schedules", due.size)
        due.forEach { schedule ->
            try {
                outboxService.publish(
                    aggregateType = "AllowanceSchedule",
                    aggregateId = schedule.id.toString(),
                    eventType = "card.allowance.due",
                    topic = "card.events",
                    payload = mapOf(
                        "scheduleId" to schedule.id,
                        "cardId" to schedule.card.id,
                        "amountUzs" to schedule.amountUzs,
                        "frequency" to schedule.frequency,
                        "triggeredAt" to now,
                    ),
                )

                schedule.lastRunAt = now
                schedule.nextRunAt = computeNextRunAt(schedule.frequency, schedule.dayOfWeek, schedule.dayOfMonth)
                schedule.updatedAt = now
                allowanceScheduleRepository.save(schedule)

                log.debug(
                    "Allowance processed: scheduleId={} cardId={} nextRunAt={}",
                    schedule.id,
                    schedule.card.id,
                    schedule.nextRunAt,
                )
            } catch (ex: Exception) {
                log.error("Failed to process allowance schedule: id={}", schedule.id, ex)
            }
        }
    }

    private fun computeNextRunAt(frequency: AllowanceFrequency, dayOfWeek: Short?, dayOfMonth: Short?): Instant {
        val now = ZonedDateTime.now(ZoneOffset.UTC)
        return when (frequency) {
            AllowanceFrequency.WEEKLY -> {
                val targetDow = dayOfWeek?.let { DayOfWeek.of(it.toInt()) } ?: DayOfWeek.MONDAY
                var next = now.with(TemporalAdjusters.nextOrSame(targetDow))
                    .withHour(0).withMinute(0).withSecond(0).withNano(0)
                // If today is the target day but we're past midnight, move to next week
                if (!next.isAfter(now)) {
                    next = next.plusWeeks(1)
                }
                next.toInstant()
            }

            AllowanceFrequency.MONTHLY -> {
                val targetDay = (dayOfMonth?.toInt() ?: 1).coerceIn(1, 28)
                var next = now.withDayOfMonth(targetDay)
                    .withHour(0).withMinute(0).withSecond(0).withNano(0)
                if (!next.isAfter(now)) {
                    next = next.plusMonths(1)
                }
                next.toInstant()
            }
        }
    }
}
