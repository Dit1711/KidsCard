package uz.kidscard.payment.service

import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.common.exception.BusinessException
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
 * Moves money between a child's card and a savings-goal pot (a SAVINGS ledger
 * account keyed by goalId). Saving really reduces the spendable card balance,
 * so the goal means something.
 */
@Service
@Transactional
class SavingsService(
    private val ledgerEntryRepository: LedgerEntryRepository,
    private val transactionRepository: TransactionRepository,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Transactional(readOnly = true)
    fun saved(goalId: UUID): Long = ledgerEntryRepository.computeSavingsBalance(goalId.toString())

    fun deposit(cardId: UUID, childId: UUID, familyId: UUID, goalId: UUID, amountUzs: Long): Long {
        require(amountUzs > 0)
        val cardBalance = ledgerEntryRepository.computeBalance(cardId.toString())
        if (cardBalance < amountUzs) {
            throw BusinessException(
                "INSUFFICIENT_FUNDS",
                "На карте недостаточно денег, чтобы отложить столько",
                HttpStatus.UNPROCESSABLE_ENTITY,
            )
        }
        move(cardId, childId, familyId, goalId, amountUzs, fromCard = true, "Отложено на цель")
        val newSaved = saved(goalId)
        log.info("Savings deposit: goal={} card={} amount={} saved={}", goalId, cardId, amountUzs, newSaved)
        return newSaved
    }

    fun withdraw(cardId: UUID, childId: UUID, familyId: UUID, goalId: UUID, amountUzs: Long): Long {
        require(amountUzs > 0)
        val savedNow = saved(goalId)
        if (savedNow < amountUzs) {
            throw BusinessException("INSUFFICIENT_SAVINGS", "В копилке меньше денег", HttpStatus.UNPROCESSABLE_ENTITY)
        }
        move(cardId, childId, familyId, goalId, amountUzs, fromCard = false, "Снято с цели на карту")
        val newSaved = saved(goalId)
        log.info("Savings withdraw: goal={} card={} amount={} saved={}", goalId, cardId, amountUzs, newSaved)
        return newSaved
    }

    private fun move(
        cardId: UUID,
        childId: UUID,
        familyId: UUID,
        goalId: UUID,
        amountUzs: Long,
        fromCard: Boolean,
        description: String,
    ) {
        val tx = Transaction(
            idempotencyKey = "savings-${UUID.randomUUID()}",
            cardId = cardId,
            childId = childId,
            familyId = familyId,
            type = TransactionType.TRANSFER,
            status = TransactionStatus.COMPLETED,
            amountUzs = amountUzs,
            direction = if (fromCard) Direction.DEBIT else Direction.CREDIT,
            description = description,
            capturedAt = Instant.now(),
        )
        transactionRepository.save(tx)

        val cardBalance = ledgerEntryRepository.computeBalance(cardId.toString()) +
            if (fromCard) -amountUzs else amountUzs
        ledgerEntryRepository.save(
            LedgerEntry(
                transaction = tx, accountId = cardId.toString(), accountType = AccountType.CARD,
                direction = if (fromCard) Direction.DEBIT else Direction.CREDIT,
                amountUzs = amountUzs, runningBalance = cardBalance,
            ),
        )
        val savingsBalance = ledgerEntryRepository.computeSavingsBalance(goalId.toString()) +
            if (fromCard) amountUzs else -amountUzs
        ledgerEntryRepository.save(
            LedgerEntry(
                transaction = tx, accountId = goalId.toString(), accountType = AccountType.SAVINGS,
                direction = if (fromCard) Direction.CREDIT else Direction.DEBIT,
                amountUzs = amountUzs, runningBalance = savingsBalance,
            ),
        )
    }
}
