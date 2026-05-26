package uz.kidscard.openbanking.adapter

import java.math.BigDecimal
import java.util.UUID

interface BankAdapter {
    val bankCode: String

    // AIS — Account Information Service
    suspend fun initiateConsent(request: ConsentRequest): ConsentResponse
    suspend fun exchangeCode(code: String, consentId: UUID): TokenPair
    suspend fun refreshToken(refreshToken: String): TokenPair
    suspend fun revokeConsent(externalConsentId: String, accessToken: String)
    suspend fun getAccounts(accessToken: String): List<AccountInfo>
    suspend fun getBalance(accessToken: String, externalAccountId: String): BalanceInfo
    suspend fun getTransactionHistory(
        accessToken: String,
        externalAccountId: String,
        request: TransactionHistoryRequest,
    ): List<TransactionRecord>

    // PIS — Payment Initiation Service
    suspend fun initiatePayment(request: PaymentRequest): PaymentResponse
    suspend fun getPaymentStatus(accessToken: String, externalPaymentId: String): PaymentStatus
}

data class ConsentRequest(
    val redirectUri: String,
    val scopes: List<String>,
    val state: String,
)

data class ConsentResponse(
    val externalConsentId: String,
    val authorizationUrl: String,
)

data class TokenPair(
    val accessToken: String,
    val refreshToken: String,
    val expiresInSeconds: Long,
)

data class AccountInfo(
    val externalId: String,
    val accountType: String,
    val maskedNumber: String?,
    val holderName: String?,
    val currency: String,
)

data class BalanceInfo(
    val externalAccountId: String,
    val availableAmount: BigDecimal,
    val currency: String,
)

data class TransactionHistoryRequest(
    val fromDate: java.time.LocalDate,
    val toDate: java.time.LocalDate,
    val limit: Int = 100,
    val offset: Int = 0,
)

data class TransactionRecord(
    val externalId: String,
    val amount: BigDecimal,
    val currency: String,
    val direction: String,
    val merchantName: String?,
    val description: String?,
    val executedAt: java.time.Instant,
)

data class PaymentRequest(
    val idempotencyKey: String,
    val accessToken: String,
    val fromExternalAccountId: String,
    val toCardToken: String,
    val amount: BigDecimal,
    val currency: String,
    val description: String?,
)

data class PaymentResponse(
    val externalPaymentId: String,
    val status: PaymentStatus,
)

enum class PaymentStatus { PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED }
