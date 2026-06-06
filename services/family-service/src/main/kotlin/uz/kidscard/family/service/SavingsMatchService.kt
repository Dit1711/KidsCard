package uz.kidscard.family.service

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.family.domain.MatchAward
import uz.kidscard.family.domain.SavingsMatchRule
import uz.kidscard.family.repository.MatchAwardRepository
import uz.kidscard.family.repository.SavingsMatchRuleRepository
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

/** Effective match settings for a child, plus this month's usage. */
data class MatchSettings(
    val percent: Int,
    val monthlyCapUzs: Long?,
    val usedThisMonthUzs: Long,
)

@Service
@Transactional
class SavingsMatchService(
    private val ruleRepository: SavingsMatchRuleRepository,
    private val awardRepository: MatchAwardRepository,
) {
    private val zone = ZoneId.of("Asia/Tashkent")

    private fun startOfMonth(): Instant =
        LocalDate.now(zone).withDayOfMonth(1).atStartOfDay(zone).toInstant()

    @Transactional(readOnly = true)
    fun settings(childId: UUID): MatchSettings {
        val rule = ruleRepository.findById(childId).orElse(null)
        return MatchSettings(
            percent = rule?.percent ?: 0,
            monthlyCapUzs = rule?.monthlyCapUzs,
            usedThisMonthUzs = awardRepository.sumSince(childId, startOfMonth()),
        )
    }

    fun update(childId: UUID, percent: Int, monthlyCapUzs: Long?): MatchSettings {
        val safePercent = percent.coerceIn(0, 200)
        val safeCap = monthlyCapUzs?.takeIf { it > 0 }
        val rule = ruleRepository.findById(childId).orElse(SavingsMatchRule(childId = childId))
        rule.percent = safePercent
        rule.monthlyCapUzs = safeCap
        rule.updatedAt = Instant.now()
        ruleRepository.save(rule)
        return MatchSettings(safePercent, safeCap, awardRepository.sumSince(childId, startOfMonth()))
    }

    /**
     * How much match a [depositUzs] contribution would earn right now, after
     * applying the percent and the remaining monthly cap. Does not fund anything.
     */
    @Transactional(readOnly = true)
    fun plannedMatch(childId: UUID, depositUzs: Long): Long {
        val rule = ruleRepository.findById(childId).orElse(null) ?: return 0
        if (rule.percent <= 0 || depositUzs <= 0) return 0
        var match = depositUzs * rule.percent / 100
        rule.monthlyCapUzs?.let { cap ->
            val remaining = cap - awardRepository.sumSince(childId, startOfMonth())
            match = minOf(match, remaining)
        }
        return match.coerceAtLeast(0)
    }

    /** Record a successfully funded match (audit + monthly-cap accounting). */
    fun recordAward(childId: UUID, goalId: UUID, amountUzs: Long) {
        awardRepository.save(MatchAward(childId = childId, goalId = goalId, amountUzs = amountUzs))
    }
}
