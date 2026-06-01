package uz.kidscard.payment.service

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.payment.api.dto.CategorySpendDto
import uz.kidscard.payment.api.dto.DaySpendDto
import uz.kidscard.payment.api.dto.SpendAnalyticsDto
import uz.kidscard.payment.repository.LedgerEntryRepository
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID

@Service
class AnalyticsService(
    private val ledgerEntryRepository: LedgerEntryRepository,
) {
    private val zone = ZoneOffset.UTC

    /** Spend breakdown for a card: total, by category (MCC) and by day. */
    @Transactional(readOnly = true)
    fun cardSpend(cardId: UUID, days: Int): SpendAnalyticsDto {
        val window = days.coerceIn(1, 365)
        val todayStart = LocalDate.now(zone)
        val since = todayStart.minusDays((window - 1).toLong()).atStartOfDay(zone).toInstant()

        val rows = ledgerEntryRepository.spendRowsSince(cardId.toString(), since)
        val total = rows.sumOf { it.amountUzs }

        val byCategory = rows
            .groupBy { it.mcc ?: "0000" }
            .map { (mcc, list) -> CategorySpendDto(mcc, list.sumOf { it.amountUzs }) }
            .sortedByDescending { it.amountUzs }

        // Daily totals over the whole window, including zero days so the chart is continuous.
        val perDay = rows
            .groupBy { LocalDate.ofInstant(it.createdAt, zone) }
            .mapValues { (_, list) -> list.sumOf { it.amountUzs } }
        val byDay = (0 until window).map { i ->
            val d = todayStart.minusDays((window - 1 - i).toLong())
            DaySpendDto(d.toString(), perDay[d] ?: 0L)
        }

        return SpendAnalyticsDto(window, total, byCategory, byDay)
    }
}
