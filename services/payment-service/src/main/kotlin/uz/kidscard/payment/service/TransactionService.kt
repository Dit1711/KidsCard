package uz.kidscard.payment.service

import org.slf4j.LoggerFactory
import org.springframework.data.domain.PageRequest
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.common.exception.BusinessException
import uz.kidscard.common.exception.ResourceNotFoundException
import uz.kidscard.payment.api.dto.BalanceDto
import uz.kidscard.payment.api.dto.PageDto
import uz.kidscard.payment.api.dto.PayoutRequest
import uz.kidscard.payment.api.dto.PurchaseRequest
import uz.kidscard.payment.api.dto.TopUpRequest
import uz.kidscard.payment.api.dto.TransferRequest
import uz.kidscard.payment.api.dto.TransactionDto
import uz.kidscard.payment.api.dto.toDto
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

@Service
@Transactional
class TransactionService(
    private val transactionRepository: TransactionRepository,
    private val ledgerEntryRepository: LedgerEntryRepository,
    private val limitCheckService: LimitCheckService,
    private val outboxService: OutboxService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun topUp(req: TopUpRequest): TransactionDto {
        // Idempotency check
        val existing = transactionRepository.findByIdempotencyKey(req.idempotencyKey).orElse(null)
        if (existing != null) {
            val balance = ledgerEntryRepository.computeBalance(req.cardId.toString())
            log.debug("Idempotent top-up replay: key={}", req.idempotencyKey)
            return existing.toDto(balance)
        }

        val tx = Transaction(
            idempotencyKey = req.idempotencyKey,
            cardId = req.cardId,
            childId = req.childId,
            familyId = req.familyId,
            type = TransactionType.TOPUP,
            status = TransactionStatus.PENDING,
            amountUzs = req.amountUzs,
            direction = Direction.CREDIT,
            description = req.description ?: "Пополнение карты",
        )
        transactionRepository.save(tx)

        // Ledger: CREDIT card account
        val currentBalance = ledgerEntryRepository.computeBalance(req.cardId.toString())
        val newBalance = currentBalance + req.amountUzs

        val cardEntry = LedgerEntry(
            transaction = tx,
            accountId = req.cardId.toString(),
            accountType = AccountType.CARD,
            direction = Direction.CREDIT,
            amountUzs = req.amountUzs,
            runningBalance = newBalance,
        )
        // Ledger: DEBIT float account (parent wallet / external source)
        val floatEntry = LedgerEntry(
            transaction = tx,
            accountId = "PARENT_FLOAT",
            accountType = AccountType.FLOAT,
            direction = Direction.DEBIT,
            amountUzs = req.amountUzs,
            runningBalance = 0L,
        )
        ledgerEntryRepository.save(cardEntry)
        ledgerEntryRepository.save(floatEntry)

        tx.status = TransactionStatus.COMPLETED
        tx.capturedAt = Instant.now()
        tx.updatedAt = Instant.now()
        transactionRepository.save(tx)

        publishTransactionEvent(tx, newBalance)
        log.info("Top-up completed: cardId={} amount={} newBalance={}", req.cardId, req.amountUzs, newBalance)
        return tx.toDto(newBalance)
    }

    /** Move money between two cards in the same family (double-entry via FLOAT). */
    fun transfer(req: TransferRequest): TransactionDto {
        require(req.fromCardId != req.toCardId) { "Cannot transfer to the same card" }
        val outKey = "${req.idempotencyKey}-out"
        transactionRepository.findByIdempotencyKey(outKey).orElse(null)?.let {
            return it.toDto(ledgerEntryRepository.computeBalance(req.fromCardId.toString()))
        }

        val srcBalance = ledgerEntryRepository.computeBalance(req.fromCardId.toString())
        if (srcBalance < req.amountUzs) {
            throw BusinessException("INSUFFICIENT_FUNDS", "Недостаточно средств на карте", HttpStatus.UNPROCESSABLE_ENTITY)
        }

        // OUT: debit source card, credit float
        val outTx = transactionRepository.save(
            Transaction(
                idempotencyKey = outKey, cardId = req.fromCardId, childId = req.fromChildId, familyId = req.familyId,
                type = TransactionType.TRANSFER, status = TransactionStatus.PENDING, amountUzs = req.amountUzs,
                direction = Direction.DEBIT, description = req.description ?: "Перевод на карту",
            ),
        )
        val newSrc = srcBalance - req.amountUzs
        ledgerEntryRepository.save(LedgerEntry(transaction = outTx, accountId = req.fromCardId.toString(), accountType = AccountType.CARD, direction = Direction.DEBIT, amountUzs = req.amountUzs, runningBalance = newSrc))
        ledgerEntryRepository.save(LedgerEntry(transaction = outTx, accountId = "PARENT_FLOAT", accountType = AccountType.FLOAT, direction = Direction.CREDIT, amountUzs = req.amountUzs, runningBalance = 0L))
        outTx.status = TransactionStatus.COMPLETED; outTx.capturedAt = Instant.now(); outTx.updatedAt = Instant.now()
        transactionRepository.save(outTx)

        // IN: credit destination card, debit float
        val destBalance = ledgerEntryRepository.computeBalance(req.toCardId.toString())
        val inTx = transactionRepository.save(
            Transaction(
                idempotencyKey = "${req.idempotencyKey}-in", cardId = req.toCardId, childId = req.toChildId, familyId = req.familyId,
                type = TransactionType.TRANSFER, status = TransactionStatus.PENDING, amountUzs = req.amountUzs,
                direction = Direction.CREDIT, description = "Перевод с карты",
            ),
        )
        val newDest = destBalance + req.amountUzs
        ledgerEntryRepository.save(LedgerEntry(transaction = inTx, accountId = req.toCardId.toString(), accountType = AccountType.CARD, direction = Direction.CREDIT, amountUzs = req.amountUzs, runningBalance = newDest))
        ledgerEntryRepository.save(LedgerEntry(transaction = inTx, accountId = "PARENT_FLOAT", accountType = AccountType.FLOAT, direction = Direction.DEBIT, amountUzs = req.amountUzs, runningBalance = 0L))
        inTx.status = TransactionStatus.COMPLETED; inTx.capturedAt = Instant.now(); inTx.updatedAt = Instant.now()
        transactionRepository.save(inTx)

        publishTransactionEvent(outTx, newSrc)
        publishTransactionEvent(inTx, newDest)
        log.info("Transfer completed: {} -> {} amount={}", req.fromCardId, req.toCardId, req.amountUzs)
        return outTx.toDto(newSrc)
    }

    /** Withdraw from a card to a linked bank account; OB credits the account on the event. */
    fun payout(req: PayoutRequest): TransactionDto {
        transactionRepository.findByIdempotencyKey(req.idempotencyKey).orElse(null)?.let {
            return it.toDto(ledgerEntryRepository.computeBalance(req.cardId.toString()))
        }
        val srcBalance = ledgerEntryRepository.computeBalance(req.cardId.toString())
        if (srcBalance < req.amountUzs) {
            throw BusinessException("INSUFFICIENT_FUNDS", "Недостаточно средств на карте", HttpStatus.UNPROCESSABLE_ENTITY)
        }

        val tx = transactionRepository.save(
            Transaction(
                idempotencyKey = req.idempotencyKey, cardId = req.cardId, childId = req.childId, familyId = req.familyId,
                type = TransactionType.TRANSFER, status = TransactionStatus.PENDING, amountUzs = req.amountUzs,
                direction = Direction.DEBIT, description = req.description ?: "Вывод на счёт",
            ),
        )
        val newBalance = srcBalance - req.amountUzs
        ledgerEntryRepository.save(LedgerEntry(transaction = tx, accountId = req.cardId.toString(), accountType = AccountType.CARD, direction = Direction.DEBIT, amountUzs = req.amountUzs, runningBalance = newBalance))
        ledgerEntryRepository.save(LedgerEntry(transaction = tx, accountId = "PARENT_FLOAT", accountType = AccountType.FLOAT, direction = Direction.CREDIT, amountUzs = req.amountUzs, runningBalance = 0L))
        tx.status = TransactionStatus.COMPLETED; tx.capturedAt = Instant.now(); tx.updatedAt = Instant.now()
        transactionRepository.save(tx)

        publishTransactionEvent(tx, newBalance)
        outboxService.publish(
            aggregateType = "Transaction", aggregateId = tx.id.toString(),
            eventType = "payment.payout.completed", topic = "payment.events",
            payload = mapOf(
                "eventType" to "payment.payout.completed",
                "transactionId" to tx.id, "accountId" to req.accountId, "cardId" to req.cardId,
                "familyId" to req.familyId, "amountUzs" to req.amountUzs,
            ),
        )
        log.info("Payout completed: card={} account={} amount={}", req.cardId, req.accountId, req.amountUzs)
        return tx.toDto(newBalance)
    }

    fun purchase(req: PurchaseRequest, authToken: String? = null, asChild: Boolean = false): TransactionDto {
        // Idempotency check
        val existing = transactionRepository.findByIdempotencyKey(req.idempotencyKey).orElse(null)
        if (existing != null) {
            val balance = ledgerEntryRepository.computeBalance(req.cardId.toString())
            return existing.toDto(balance)
        }

        // Check spending limits (best-effort — skipped if family-service is unavailable)
        if (!authToken.isNullOrBlank()) {
            try {
                if (asChild) {
                    limitCheckService.checkLimitsChild(req.cardId, req.amountUzs, req.merchantMcc, authToken)
                } else {
                    limitCheckService.checkLimits(req.cardId, req.childId, req.familyId, req.amountUzs, req.merchantMcc, authToken)
                }
            } catch (ex: BusinessException) {
                if (ex.code == "LIMIT_EXCEEDED" || ex.code == "CATEGORY_LIMIT_EXCEEDED") {
                    // Notify the parent even though the purchase rolls back — REQUIRES_NEW.
                    outboxService.publishInNewTransaction(
                        aggregateType = "Transaction",
                        aggregateId = req.cardId.toString(),
                        eventType = "payment.limit.exceeded",
                        topic = "payment.events",
                        payload = mapOf(
                            "eventType" to "payment.limit.exceeded",
                            "familyId" to req.familyId,
                            "childId" to req.childId,
                            "cardId" to req.cardId,
                            "amountUzs" to req.amountUzs,
                            "merchantName" to req.merchantName,
                            "merchantMcc" to req.merchantMcc,
                            "limitCode" to ex.code,
                        ),
                    )
                }
                throw ex
            }
        }

        val currentBalance = ledgerEntryRepository.computeBalance(req.cardId.toString())
        if (currentBalance < req.amountUzs) {
            throw BusinessException(
                "INSUFFICIENT_FUNDS",
                "Insufficient balance. Available: $currentBalance UZS, required: ${req.amountUzs} UZS",
                HttpStatus.UNPROCESSABLE_ENTITY,
            )
        }

        val tx = Transaction(
            idempotencyKey = req.idempotencyKey,
            cardId = req.cardId,
            childId = req.childId,
            familyId = req.familyId,
            type = TransactionType.PURCHASE,
            status = TransactionStatus.PENDING,
            amountUzs = req.amountUzs,
            direction = Direction.DEBIT,
            merchantName = req.merchantName,
            merchantMcc = req.merchantMcc,
            description = req.description ?: req.merchantName ?: "Покупка",
        )
        transactionRepository.save(tx)

        val newBalance = currentBalance - req.amountUzs

        val cardEntry = LedgerEntry(
            transaction = tx,
            accountId = req.cardId.toString(),
            accountType = AccountType.CARD,
            direction = Direction.DEBIT,
            amountUzs = req.amountUzs,
            runningBalance = newBalance,
        )
        val revenueEntry = LedgerEntry(
            transaction = tx,
            accountId = "MERCHANT_FLOAT",
            accountType = AccountType.REVENUE,
            direction = Direction.CREDIT,
            amountUzs = req.amountUzs,
            runningBalance = 0L,
        )
        ledgerEntryRepository.save(cardEntry)
        ledgerEntryRepository.save(revenueEntry)

        tx.status = TransactionStatus.COMPLETED
        tx.authorizedAt = Instant.now()
        tx.capturedAt = Instant.now()
        tx.updatedAt = Instant.now()
        transactionRepository.save(tx)

        publishTransactionEvent(tx, newBalance)
        log.info("Purchase completed: cardId={} amount={} merchant={} newBalance={}", req.cardId, req.amountUzs, req.merchantName, newBalance)
        return tx.toDto(newBalance)
    }

    private fun publishTransactionEvent(tx: Transaction, balanceAfter: Long) {
        outboxService.publish(
            aggregateType = "Transaction",
            aggregateId = tx.id.toString(),
            eventType = "payment.transaction.completed",
            topic = "payment.events",
            payload = mapOf(
                "eventType" to "payment.transaction.completed",
                "transactionId" to tx.id,
                "cardId" to tx.cardId,
                "childId" to tx.childId,
                "familyId" to tx.familyId,
                "type" to tx.type.name,
                "direction" to tx.direction.name,
                "amountUzs" to tx.amountUzs,
                "merchantName" to tx.merchantName,
                "description" to tx.description,
                "balanceAfter" to balanceAfter,
                "createdAt" to tx.createdAt,
            ),
        )
    }

    @Transactional(readOnly = true)
    fun getBalance(cardId: UUID): BalanceDto {
        val balance = ledgerEntryRepository.computeBalance(cardId.toString())
        return BalanceDto(cardId = cardId, balanceUzs = balance)
    }

    @Transactional(readOnly = true)
    fun getByCard(cardId: UUID, page: Int, size: Int): PageDto<TransactionDto> {
        val pageable = PageRequest.of(page, size)
        val txPage = transactionRepository.findByCardIdOrderByCreatedAtDesc(cardId, pageable)
        val balance = ledgerEntryRepository.computeBalance(cardId.toString())
        return PageDto(
            content = txPage.content.map { it.toDto(balance) },
            page = txPage.number,
            size = txPage.size,
            totalElements = txPage.totalElements,
            totalPages = txPage.totalPages,
        )
    }

    @Transactional(readOnly = true)
    fun getByFamily(familyId: UUID, page: Int, size: Int): PageDto<TransactionDto> {
        val pageable = PageRequest.of(page, size)
        val txPage = transactionRepository.findByFamilyIdOrderByCreatedAtDesc(familyId, pageable)
        return PageDto(
            content = txPage.content.map { it.toDto(0L) },
            page = txPage.number,
            size = txPage.size,
            totalElements = txPage.totalElements,
            totalPages = txPage.totalPages,
        )
    }
}
