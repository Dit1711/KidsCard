package uz.kidscard.payment.service

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.payment.domain.AccountType
import uz.kidscard.payment.domain.Direction
import uz.kidscard.payment.domain.LedgerEntry
import uz.kidscard.payment.domain.Transaction
import uz.kidscard.payment.domain.TransactionStatus
import uz.kidscard.payment.domain.TransactionType
import uz.kidscard.payment.repository.LedgerEntryRepository
import uz.kidscard.payment.repository.TransactionRepository
import java.time.Instant
import java.util.UUID

/**
 * Pays interest on savings-goal balances — makes a goal a "real" deposit.
 * One accrual cycle credits a month's interest (balance × rate/12) to each
 * goal pot from an INTEREST_FLOAT account, and emits savings.interest.accrued
 * so family-service bumps the goal's currentAmount.
 */
@Service
class SavingsInterestService(
    private val ledgerEntryRepository: LedgerEntryRepository,
    private val transactionRepository: TransactionRepository,
    private val outboxService: OutboxService,
    @Value("\${app.savings.annual-rate-percent:12}") private val annualRatePercent: Double,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun ratePercent(): Double = annualRatePercent

    /** Production: accrue on the 1st of every month at 00:05. */
    @Scheduled(cron = "0 5 0 1 * *")
    fun scheduledAccrual() {
        accrueAll()
    }

    @Transactional
    fun accrueAll(): Map<String, Long> {
        val monthlyRate = annualRatePercent / 100.0 / 12.0
        var goalsPaid = 0
        var total = 0L

        ledgerEntryRepository.findSavingsAccountIds().forEach { goalIdStr ->
            val goalId = runCatching { UUID.fromString(goalIdStr) }.getOrNull() ?: return@forEach
            val balance = ledgerEntryRepository.computeSavingsBalance(goalIdStr)
            if (balance <= 0) return@forEach
            val interest = Math.round(balance * monthlyRate)
            if (interest <= 0) return@forEach

            val tx = Transaction(
                idempotencyKey = "interest-${UUID.randomUUID()}",
                cardId = goalId, // goal-bound; never shown as a card tx
                childId = goalId,
                familyId = goalId,
                type = TransactionType.TOPUP,
                status = TransactionStatus.COMPLETED,
                amountUzs = interest,
                direction = Direction.CREDIT,
                description = "Процент по накоплениям",
                capturedAt = Instant.now(),
            )
            transactionRepository.save(tx)

            val newSaved = balance + interest
            ledgerEntryRepository.save(
                LedgerEntry(
                    transaction = tx, accountId = goalIdStr, accountType = AccountType.SAVINGS,
                    direction = Direction.CREDIT, amountUzs = interest, runningBalance = newSaved,
                ),
            )
            ledgerEntryRepository.save(
                LedgerEntry(
                    transaction = tx, accountId = "INTEREST_FLOAT", accountType = AccountType.FLOAT,
                    direction = Direction.DEBIT, amountUzs = interest, runningBalance = 0L,
                ),
            )

            outboxService.publish(
                aggregateType = "SavingsGoal",
                aggregateId = goalIdStr,
                eventType = "savings.interest.accrued",
                topic = "savings.events",
                payload = mapOf(
                    "eventType" to "savings.interest.accrued",
                    "goalId" to goalIdStr,
                    "amountUzs" to interest,
                    "newSaved" to newSaved,
                ),
            )
            goalsPaid++
            total += interest
        }
        log.info("Interest accrual: {} goals paid, total {} (rate {}%/yr)", goalsPaid, total, annualRatePercent)
        return mapOf("goalsPaid" to goalsPaid.toLong(), "totalInterest" to total)
    }
}
