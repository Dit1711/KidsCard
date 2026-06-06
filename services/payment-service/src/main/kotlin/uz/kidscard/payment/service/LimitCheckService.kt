package uz.kidscard.payment.service

import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import uz.kidscard.common.exception.BusinessException
import uz.kidscard.payment.repository.LedgerEntryRepository
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

data class LimitUsageDto(
    val limitType: String,
    val category: String?,
    val limitUzs: Long,
    val spentUzs: Long,
    val remainingUzs: Long,
)

@Service
class LimitCheckService(
    private val ledgerEntryRepository: LedgerEntryRepository,
    private val familyLimitClient: FamilyLimitClient,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    /** Parent-initiated purchase: limits via the family path. Returns true if the amount needs parent approval (PC-05). */
    fun checkLimits(cardId: UUID, childId: UUID, familyId: UUID, amountUzs: Long, merchantMcc: String?, token: String): Boolean =
        evaluate(cardId, amountUzs, merchantMcc, familyLimitClient.getLimitsForChild(familyId, childId, token))

    /** Child-initiated purchase: limits via the child path. Returns true if the amount needs parent approval (PC-05). */
    fun checkLimitsChild(cardId: UUID, amountUzs: Long, merchantMcc: String?, token: String): Boolean =
        evaluate(cardId, amountUzs, merchantMcc, familyLimitClient.getLimitsForChildSelf(token))

    /** Child cabinet: each of the child's limits with how much is spent/left. */
    fun usageForChild(cardId: UUID, token: String): List<LimitUsageDto> {
        val now = Instant.now()
        val monthStart = now.truncatedTo(ChronoUnit.DAYS).let {
            val day = java.time.ZonedDateTime.ofInstant(it, java.time.ZoneOffset.UTC).dayOfMonth
            it.minus((day - 1).toLong(), ChronoUnit.DAYS)
        }
        return familyLimitClient.getLimitsForChildSelf(token).mapNotNull { limit ->
            val spent = when (limit.limitType) {
                "DAILY"   -> ledgerEntryRepository.computeSpentSince(cardId.toString(), now.truncatedTo(ChronoUnit.DAYS))
                "WEEKLY"  -> ledgerEntryRepository.computeSpentSince(cardId.toString(), now.minus(now.dayOfWeek(), ChronoUnit.DAYS).truncatedTo(ChronoUnit.DAYS))
                "MONTHLY" -> ledgerEntryRepository.computeSpentSince(cardId.toString(), monthStart)
                "CATEGORY" -> limit.category?.let { ledgerEntryRepository.computeCategorySpentSince(cardId.toString(), it, monthStart) } ?: return@mapNotNull null
                else -> return@mapNotNull null
            }
            LimitUsageDto(
                limitType = limit.limitType,
                category = limit.category,
                limitUzs = limit.amountUzs,
                spentUzs = spent.coerceAtMost(limit.amountUzs),
                remainingUzs = (limit.amountUzs - spent).coerceAtLeast(0),
            )
        }
    }

    /**
     * Checks spending limits against the current ledger. Throws BusinessException if a
     * hard cap is exceeded; returns true when an APPROVAL threshold means this purchase
     * must wait for a parent's decision (PC-05).
     */
    private fun evaluate(cardId: UUID, amountUzs: Long, merchantMcc: String?, limits: List<LimitRuleDto>): Boolean {
        if (limits.isEmpty()) return false

        val requiresApproval = limits.any { it.limitType == "APPROVAL" && amountUzs >= it.amountUzs }

        val now = Instant.now()

        val monthStart = now.truncatedTo(ChronoUnit.DAYS).let {
            val day = java.time.ZonedDateTime.ofInstant(it, java.time.ZoneOffset.UTC).dayOfMonth
            it.minus((day - 1).toLong(), ChronoUnit.DAYS)
        }

        limits.forEach { limit ->
            // CATEGORY: monthly budget on one merchant category (exact MCC match).
            // Only counts this purchase if its MCC matches, and sums only that
            // category's spend for the month — not total spending.
            if (limit.limitType == "CATEGORY") {
                if (limit.category == null || merchantMcc == null || merchantMcc != limit.category) return@forEach
                val spent = ledgerEntryRepository.computeCategorySpentSince(cardId.toString(), merchantMcc, monthStart)
                if (spent + amountUzs > limit.amountUzs) {
                    val available = (limit.amountUzs - spent).coerceAtLeast(0)
                    log.warn("Category limit exceeded: card={} mcc={} limit={} spent={} requested={}", cardId, merchantMcc, limit.amountUzs, spent, amountUzs)
                    throw BusinessException(
                        "CATEGORY_LIMIT_EXCEEDED",
                        "Превышен лимит по категории: доступно $available UZS, запрошено $amountUzs UZS",
                        HttpStatus.UNPROCESSABLE_ENTITY,
                    )
                }
                return@forEach
            }

            val periodStart: Instant = when (limit.limitType) {
                "DAILY"   -> now.truncatedTo(ChronoUnit.DAYS)
                "WEEKLY"  -> now.minus(now.dayOfWeek(), ChronoUnit.DAYS).truncatedTo(ChronoUnit.DAYS)
                "MONTHLY" -> monthStart
                else -> return@forEach
            }

            val spent = ledgerEntryRepository.computeSpentSince(cardId.toString(), periodStart)
            if (spent + amountUzs > limit.amountUzs) {
                val available = (limit.amountUzs - spent).coerceAtLeast(0)
                log.warn("Limit exceeded: cardId={} type={} limit={} spent={} requested={}", cardId, limit.limitType, limit.amountUzs, spent, amountUzs)
                throw BusinessException(
                    "LIMIT_EXCEEDED",
                    "Превышен лимит ${limit.limitType}: доступно $available UZS, запрошено $amountUzs UZS",
                    HttpStatus.UNPROCESSABLE_ENTITY,
                )
            }
        }

        return requiresApproval
    }

    private fun Instant.dayOfWeek(): Long {
        val zdt = java.time.ZonedDateTime.ofInstant(this, java.time.ZoneOffset.UTC)
        return (zdt.dayOfWeek.value - 1).toLong()
    }
}
