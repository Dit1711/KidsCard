package uz.kidscard.payment.service

import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.common.exception.BusinessException
import uz.kidscard.payment.api.dto.WalletDto
import uz.kidscard.payment.domain.AccountType
import uz.kidscard.payment.domain.Direction
import uz.kidscard.payment.domain.Hold
import uz.kidscard.payment.domain.HoldStatus
import uz.kidscard.payment.domain.LedgerEntry
import uz.kidscard.payment.domain.Transaction
import uz.kidscard.payment.domain.TransactionStatus
import uz.kidscard.payment.domain.TransactionType
import uz.kidscard.payment.repository.HoldRepository
import uz.kidscard.payment.repository.LedgerEntryRepository
import uz.kidscard.payment.repository.TransactionRepository
import java.time.Instant
import java.util.UUID

@Service
@Transactional
class WalletService(
    private val ledgerEntryRepository: LedgerEntryRepository,
    private val holdRepository: HoldRepository,
    private val transactionRepository: TransactionRepository,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Transactional(readOnly = true)
    fun getWallet(familyId: UUID): WalletDto {
        val balance = ledgerEntryRepository.computeWalletBalance(familyId.toString())
        val held = holdRepository.sumHeld(familyId)
        return WalletDto(familyId, balance, held, (balance - held).coerceAtLeast(0))
    }

    /** Loads money into the family wallet (in prod: pulled from the linked bank). */
    fun fund(familyId: UUID, amountUzs: Long): WalletDto {
        val acct = familyId.toString()
        val newBalance = ledgerEntryRepository.computeWalletBalance(acct) + amountUzs
        // Wallet movements live in the ledger only (no card-bound Transaction row).
        ledgerEntryRepository.save(
            LedgerEntry(
                transaction = fundingPlaceholderTx(familyId, amountUzs),
                accountId = acct,
                accountType = AccountType.WALLET,
                direction = Direction.CREDIT,
                amountUzs = amountUzs,
                runningBalance = newBalance,
            ),
        )
        log.info("Wallet funded: family={} amount={} newBalance={}", familyId, amountUzs, newBalance)
        return getWallet(familyId)
    }

    /** Reserves funds for a future reward. Throws if available balance is too low. */
    fun placeHold(familyId: UUID, reference: String, amountUzs: Long): WalletDto {
        holdRepository.findByReference(reference).orElse(null)?.let {
            if (it.status == HoldStatus.HELD.name) return getWallet(familyId)
        }
        val wallet = getWallet(familyId)
        if (wallet.availableUzs < amountUzs) {
            throw BusinessException(
                "INSUFFICIENT_WALLET_FUNDS",
                "Недостаточно средств в кошельке: доступно ${wallet.availableUzs} сум, нужно $amountUzs сум",
                HttpStatus.UNPROCESSABLE_ENTITY,
            )
        }
        holdRepository.save(Hold(familyId = familyId, reference = reference, amountUzs = amountUzs))
        log.info("Hold placed: family={} ref={} amount={}", familyId, reference, amountUzs)
        return getWallet(familyId)
    }

    /** Releases a hold back to available (chore rejected/cancelled). */
    fun release(reference: String) {
        val hold = holdRepository.findByReference(reference).orElse(null) ?: return
        if (hold.status != HoldStatus.HELD.name) return
        hold.status = HoldStatus.RELEASED.name
        hold.updatedAt = Instant.now()
        holdRepository.save(hold)
        log.info("Hold released: ref={}", reference)
    }

    /**
     * Captures a hold onto a child's card: wallet is really debited, the card
     * is credited, and a Transaction is recorded so it shows in history.
     * Idempotent — a re-delivered reward event won't double-pay.
     */
    fun captureToCard(reference: String, cardId: UUID, childId: UUID, description: String): Boolean {
        val hold = holdRepository.findByReference(reference).orElse(null) ?: return false
        if (hold.status == HoldStatus.CAPTURED.name) return true   // already paid
        if (hold.status != HoldStatus.HELD.name) return false

        val tx = Transaction(
            idempotencyKey = "capture-$reference",
            cardId = cardId,
            childId = childId,
            familyId = hold.familyId,
            type = TransactionType.TOPUP,
            status = TransactionStatus.COMPLETED,
            amountUzs = hold.amountUzs,
            direction = Direction.CREDIT,
            description = description,
            capturedAt = Instant.now(),
        )
        transactionRepository.save(tx)

        val cardBalance = ledgerEntryRepository.computeBalance(cardId.toString()) + hold.amountUzs
        ledgerEntryRepository.save(
            LedgerEntry(
                transaction = tx, accountId = cardId.toString(), accountType = AccountType.CARD,
                direction = Direction.CREDIT, amountUzs = hold.amountUzs, runningBalance = cardBalance,
            ),
        )
        val walletBalance = ledgerEntryRepository.computeWalletBalance(hold.familyId.toString()) - hold.amountUzs
        ledgerEntryRepository.save(
            LedgerEntry(
                transaction = tx, accountId = hold.familyId.toString(), accountType = AccountType.WALLET,
                direction = Direction.DEBIT, amountUzs = hold.amountUzs, runningBalance = walletBalance,
            ),
        )

        hold.status = HoldStatus.CAPTURED.name
        hold.capturedToCard = cardId
        hold.updatedAt = Instant.now()
        holdRepository.save(hold)
        log.info("Hold captured: ref={} card={} amount={}", reference, cardId, hold.amountUzs)
        return true
    }

    // Wallet credits aren't card transactions; this minimal Transaction just
    // anchors the funding ledger entry (cardId reused as familyId — never shown).
    private fun fundingPlaceholderTx(familyId: UUID, amountUzs: Long): Transaction {
        val tx = Transaction(
            idempotencyKey = "wallet-fund-${UUID.randomUUID()}",
            cardId = familyId,
            childId = familyId,
            familyId = familyId,
            type = TransactionType.TOPUP,
            status = TransactionStatus.COMPLETED,
            amountUzs = amountUzs,
            direction = Direction.CREDIT,
            description = "Пополнение кошелька",
            capturedAt = Instant.now(),
        )
        return transactionRepository.save(tx)
    }
}
