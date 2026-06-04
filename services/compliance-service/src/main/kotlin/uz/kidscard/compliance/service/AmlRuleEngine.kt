package uz.kidscard.compliance.service

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.compliance.domain.AmlAlert
import uz.kidscard.compliance.domain.AmlEvent
import uz.kidscard.compliance.domain.AmlSeverity
import uz.kidscard.compliance.repository.AmlAlertRepository
import uz.kidscard.compliance.repository.AmlEventRepository
import java.text.NumberFormat
import java.time.Duration
import java.time.Instant
import java.util.Locale
import java.util.UUID

/**
 * Rule-based AML monitoring over completed transactions (ТЗ FR-KYC-03 / UC-17).
 * Each movement is projected into aml_event, then four rules run:
 *   - LARGE_TRANSACTION   single outgoing payment at/above a threshold
 *   - VELOCITY            too many movements in a short window
 *   - HIGH_DAILY_TOTAL    total outgoing in 24h at/above a threshold
 *   - STRUCTURING         several payments deliberately just under the big-tx line
 *
 * Thresholds are config (app.aml.*) so compliance can tune them without a redeploy
 * of logic. Windowed rules are deduplicated to one OPEN alert per child per day.
 */
@Service
class AmlRuleEngine(
    private val amlEventRepository: AmlEventRepository,
    private val amlAlertRepository: AmlAlertRepository,
    @Value("\${app.aml.large-transaction-uzs:5000000}") private val largeTxUzs: Long,
    @Value("\${app.aml.daily-total-uzs:10000000}") private val dailyTotalUzs: Long,
    @Value("\${app.aml.velocity-count:15}") private val velocityCount: Long,
    @Value("\${app.aml.velocity-window-minutes:60}") private val velocityWindowMinutes: Long,
    @Value("\${app.aml.structuring-count:3}") private val structuringCount: Long,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val moneyFmt = NumberFormat.getNumberInstance(Locale("ru"))

    @Transactional
    fun evaluateTransaction(
        familyId: UUID?,
        childId: UUID?,
        cardId: UUID?,
        amountUzs: Long,
        direction: String,
        type: String?,
        occurredAt: Instant,
    ) {
        amlEventRepository.save(
            AmlEvent(
                familyId = familyId, childId = childId, cardId = cardId,
                amountUzs = amountUzs, direction = direction, type = type, occurredAt = occurredAt,
            ),
        )

        // AML rules look at money LEAVING the child's card.
        if (direction != "DEBIT") return

        // 1. Single large transaction — flag each occurrence (a specific event).
        if (amountUzs >= largeTxUzs) {
            raise(
                familyId, childId, "LARGE_TRANSACTION", AmlSeverity.HIGH,
                "Крупная операция",
                "Списание ${money(amountUzs)} (порог ${money(largeTxUzs)})",
                amountUzs, dedup = false,
            )
        }

        // Remaining rules are per-child windowed aggregates.
        if (childId == null) return
        val dayAgo = occurredAt.minus(Duration.ofHours(24))

        val recentCount = amlEventRepository.countByChildIdAndOccurredAtAfter(
            childId, occurredAt.minus(Duration.ofMinutes(velocityWindowMinutes)),
        )
        if (recentCount >= velocityCount) {
            raise(
                familyId, childId, "VELOCITY", AmlSeverity.MEDIUM,
                "Частые операции",
                "$recentCount операций за $velocityWindowMinutes мин (порог $velocityCount)",
                null, dedup = true,
            )
        }

        val dailyTotal = amlEventRepository.sumSince(childId, "DEBIT", dayAgo)
        if (dailyTotal >= dailyTotalUzs) {
            raise(
                familyId, childId, "HIGH_DAILY_TOTAL", AmlSeverity.MEDIUM,
                "Большая сумма за сутки",
                "Списано ${money(dailyTotal)} за 24ч (порог ${money(dailyTotalUzs)})",
                dailyTotal, dedup = true,
            )
        }

        val structuringCountNow = amlEventRepository
            .countByChildIdAndDirectionAndOccurredAtAfterAndAmountUzsBetween(
                childId, "DEBIT", dayAgo, (largeTxUzs * 4) / 5, largeTxUzs - 1,
            )
        if (structuringCountNow >= structuringCount) {
            raise(
                familyId, childId, "STRUCTURING", AmlSeverity.HIGH,
                "Возможное структурирование",
                "$structuringCountNow операций чуть ниже порога за 24ч",
                null, dedup = true,
            )
        }
    }

    private fun raise(
        familyId: UUID?,
        childId: UUID?,
        ruleCode: String,
        severity: AmlSeverity,
        title: String,
        detail: String,
        amountUzs: Long?,
        dedup: Boolean,
    ) {
        if (dedup && childId != null &&
            amlAlertRepository.existsByChildIdAndRuleCodeAndCreatedAtAfter(
                childId, ruleCode, Instant.now().minus(Duration.ofHours(24)),
            )
        ) {
            return
        }
        amlAlertRepository.save(
            AmlAlert(
                familyId = familyId, childId = childId, ruleCode = ruleCode,
                severity = severity.name, title = title, detail = detail, amountUzs = amountUzs,
            ),
        )
        log.warn("AML alert {} (child={}, family={}): {}", ruleCode, childId, familyId, detail)
    }

    private fun money(v: Long): String = "${moneyFmt.format(v)} сум"
}
