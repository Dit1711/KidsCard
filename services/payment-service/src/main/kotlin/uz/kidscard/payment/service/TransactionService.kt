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
import uz.kidscard.payment.api.dto.PurchaseRequest
import uz.kidscard.payment.api.dto.TopUpRequest
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

        log.info("Top-up completed: cardId={} amount={} newBalance={}", req.cardId, req.amountUzs, newBalance)
        return tx.toDto(newBalance)
    }

    fun purchase(req: PurchaseRequest, authToken: String? = null): TransactionDto {
        // Idempotency check
        val existing = transactionRepository.findByIdempotencyKey(req.idempotencyKey).orElse(null)
        if (existing != null) {
            val balance = ledgerEntryRepository.computeBalance(req.cardId.toString())
            return existing.toDto(balance)
        }

        // Check spending limits (best-effort — skipped if family-service is unavailable)
        if (!authToken.isNullOrBlank()) {
            limitCheckService.checkLimits(
                cardId = req.cardId,
                childId = req.childId,
                familyId = req.familyId,
                amountUzs = req.amountUzs,
                merchantMcc = req.merchantMcc,
                token = authToken,
            )
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

        log.info("Purchase completed: cardId={} amount={} merchant={} newBalance={}", req.cardId, req.amountUzs, req.merchantName, newBalance)
        return tx.toDto(newBalance)
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
