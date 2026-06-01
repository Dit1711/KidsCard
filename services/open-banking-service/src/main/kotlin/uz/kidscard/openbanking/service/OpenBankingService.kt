package uz.kidscard.openbanking.service

import kotlinx.coroutines.runBlocking
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.common.exception.BusinessException
import uz.kidscard.common.exception.ResourceNotFoundException
import uz.kidscard.openbanking.adapter.BankAdapterRegistry
import uz.kidscard.openbanking.adapter.ConsentRequest
import uz.kidscard.openbanking.adapter.PaymentRequest
import uz.kidscard.openbanking.api.dto.BankDto
import uz.kidscard.openbanking.api.dto.FundCardRequest
import uz.kidscard.openbanking.api.dto.FundResultDto
import uz.kidscard.openbanking.api.dto.LinkedAccountDto
import uz.kidscard.openbanking.api.dto.toDto
import uz.kidscard.openbanking.domain.BankConsent
import uz.kidscard.openbanking.domain.BankPaymentRequest
import uz.kidscard.openbanking.domain.ConsentStatus
import uz.kidscard.openbanking.domain.ConsentType
import uz.kidscard.openbanking.domain.LinkedAccount
import uz.kidscard.openbanking.domain.PaymentRequestStatus
import uz.kidscard.openbanking.adapter.PaymentStatus
import uz.kidscard.openbanking.repository.BankConsentRepository
import uz.kidscard.openbanking.repository.BankPaymentRequestRepository
import uz.kidscard.openbanking.repository.LinkedAccountRepository
import java.math.BigDecimal
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

@Service
@Transactional
class OpenBankingService(
    private val registry: BankAdapterRegistry,
    private val consentRepository: BankConsentRepository,
    private val linkedAccountRepository: LinkedAccountRepository,
    private val paymentRequestRepository: BankPaymentRequestRepository,
    private val outboxService: OutboxService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    private val bankNames = mapOf(
        "MOCK" to "Демо-банк",
        "UZCARD" to "Uzcard",
        "HUMO" to "Humo",
        "NBU" to "Нацбанк",
    )

    fun supportedBanks(): List<BankDto> =
        registry.supportedBanks().map { BankDto(it, bankNames[it] ?: it) }

    /**
     * Links a bank account: initiates a consent, completes the (mock) authorization,
     * then pulls the parent's accounts via AIS and stores them with live balances.
     * A real bank would redirect the user to authorize; the mock grants immediately.
     */
    fun linkBank(userId: UUID, bankCode: String): List<LinkedAccountDto> {
        val adapter = registry.get(bankCode)

        val (consent, accounts) = runBlocking {
            val initiated = adapter.initiateConsent(
                ConsentRequest(
                    redirectUri = "http://localhost:3000/banks/callback",
                    scopes = listOf("accounts", "balances", "payments"),
                    state = UUID.randomUUID().toString(),
                ),
            )
            val consent = BankConsent(
                parentId = userId,
                bankCode = bankCode,
                consentType = ConsentType.AIS_PIS.name,
                externalId = initiated.externalConsentId,
                status = ConsentStatus.PENDING.name,
            )

            // Mock authorization callback: exchange code → tokens → ACTIVE.
            val tokens = adapter.exchangeCode("mock-auth-code", consent.id)
            consent.accessToken = tokens.accessToken
            consent.refreshToken = tokens.refreshToken
            consent.tokenExpiresAt = Instant.now().plusSeconds(tokens.expiresInSeconds)
            consent.status = ConsentStatus.ACTIVE.name
            consent.grantedAt = Instant.now()
            consent.expiresAt = Instant.now().plus(90, ChronoUnit.DAYS)

            val infos = adapter.getAccounts(tokens.accessToken)
            val accounts = infos.map { info ->
                val balance = adapter.getBalance(tokens.accessToken, info.externalId)
                LinkedAccount(
                    consentId = consent.id,
                    parentId = userId,
                    bankCode = bankCode,
                    externalAccountId = info.externalId,
                    accountType = info.accountType,
                    maskedNumber = info.maskedNumber,
                    holderName = info.holderName,
                    currency = info.currency,
                    balanceUzs = balance.availableAmount.toLong(),
                    balanceCachedAt = Instant.now(),
                )
            }
            consent to accounts
        }

        consentRepository.save(consent)
        linkedAccountRepository.saveAll(accounts)
        log.info("Bank linked: userId={} bank={} accounts={}", userId, bankCode, accounts.size)
        return accounts.map { it.toDto() }
    }

    @Transactional(readOnly = true)
    fun getLinkedAccounts(userId: UUID): List<LinkedAccountDto> =
        linkedAccountRepository.findByParentIdAndStatus(userId, "ACTIVE").map { it.toDto() }

    /**
     * PIS: initiates a payment from a linked bank account to fund a kid's card.
     * On success, emits openbanking.payment.completed so payment-service credits
     * the card's ledger (closing the bank → card loop).
     */
    fun fundCard(userId: UUID, req: FundCardRequest): FundResultDto {
        paymentRequestRepository.findByIdempotencyKey(req.idempotencyKey).orElse(null)?.let {
            return FundResultDto(it.id, it.status, it.amountUzs, it.externalRef)
        }

        val account = linkedAccountRepository.findById(req.accountId)
            .orElseThrow { ResourceNotFoundException("LinkedAccount", req.accountId) }
        if (account.parentId != userId) {
            throw BusinessException("FORBIDDEN", "Account does not belong to user", HttpStatus.FORBIDDEN)
        }
        val consent = consentRepository.findById(account.consentId)
            .orElseThrow { ResourceNotFoundException("BankConsent", account.consentId) }
        val token = consent.accessToken
            ?: throw BusinessException("CONSENT_INACTIVE", "Bank consent is not active", HttpStatus.CONFLICT)

        if ((account.balanceUzs ?: 0) < req.amountUzs) {
            throw BusinessException(
                "INSUFFICIENT_BANK_FUNDS",
                "Недостаточно средств на банковском счёте",
                HttpStatus.UNPROCESSABLE_ENTITY,
            )
        }

        val adapter = registry.get(account.bankCode)
        val request = BankPaymentRequest(
            idempotencyKey = req.idempotencyKey,
            consentId = consent.id,
            fromAccountId = account.id,
            amountUzs = req.amountUzs,
            description = req.description ?: "Пополнение карты с банковского счёта",
            status = PaymentRequestStatus.SUBMITTED.name,
            submittedAt = Instant.now(),
        )

        val response = runBlocking {
            adapter.initiatePayment(
                PaymentRequest(
                    idempotencyKey = req.idempotencyKey,
                    accessToken = token,
                    fromExternalAccountId = account.externalAccountId,
                    toCardToken = req.cardId.toString(),
                    amount = BigDecimal.valueOf(req.amountUzs),
                    currency = "UZS",
                    description = request.description,
                ),
            )
        }
        request.externalRef = response.externalPaymentId

        if (response.status == PaymentStatus.COMPLETED) {
            request.status = PaymentRequestStatus.COMPLETED.name
            request.completedAt = Instant.now()
            // Debit the cached bank balance so repeated funding reflects reality.
            account.balanceUzs = (account.balanceUzs ?: 0) - req.amountUzs
            account.updatedAt = Instant.now()
            linkedAccountRepository.save(account)
            paymentRequestRepository.save(request)

            outboxService.publish(
                aggregateType = "BankPayment",
                aggregateId = request.id.toString(),
                eventType = "openbanking.payment.completed",
                topic = "openbanking.events",
                payload = mapOf(
                    "eventType" to "openbanking.payment.completed",
                    "paymentRequestId" to request.id,
                    "cardId" to req.cardId,
                    "childId" to req.childId,
                    "familyId" to req.familyId,
                    "amountUzs" to req.amountUzs,
                    "bankCode" to account.bankCode,
                    "idempotencyKey" to req.idempotencyKey,
                ),
            )
            log.info("Bank funding completed: card={} amount={}", req.cardId, req.amountUzs)
        } else {
            request.status = PaymentRequestStatus.FAILED.name
            request.failedReason = "Bank returned status ${response.status}"
            paymentRequestRepository.save(request)
            log.warn("Bank funding failed: card={} status={}", req.cardId, response.status)
        }

        return FundResultDto(request.id, request.status, request.amountUzs, request.externalRef)
    }
}
