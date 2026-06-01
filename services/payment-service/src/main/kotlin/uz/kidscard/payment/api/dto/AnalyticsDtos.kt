package uz.kidscard.payment.api.dto

import java.time.Instant

/** Projection of a single PURCHASE debit, used to aggregate spend analytics. */
data class SpendRow(
    val mcc: String?,
    val amountUzs: Long,
    val createdAt: Instant,
)

data class CategorySpendDto(
    val mcc: String,
    val amountUzs: Long,
)

data class DaySpendDto(
    val date: String,      // yyyy-MM-dd
    val amountUzs: Long,
)

data class SpendAnalyticsDto(
    val periodDays: Int,
    val totalSpentUzs: Long,
    val byCategory: List<CategorySpendDto>,
    val byDay: List<DaySpendDto>,
)
