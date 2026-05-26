package uz.kidscard.openbanking.adapter

import org.springframework.context.annotation.Profile
import org.springframework.stereotype.Component
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

@Component
@Profile("dev", "test")
class MockBankAdapter : BankAdapter {

    override val bankCode = "MOCK"

    override suspend fun initiateConsent(request: ConsentRequest) = ConsentResponse(
        externalConsentId = UUID.randomUUID().toString(),
        authorizationUrl = "http://localhost:9999/mock/authorize?state=${request.state}",
    )

    override suspend fun exchangeCode(code: String, consentId: UUID) = TokenPair(
        accessToken = "mock_access_${UUID.randomUUID()}",
        refreshToken = "mock_refresh_${UUID.randomUUID()}",
        expiresInSeconds = 3600,
    )

    override suspend fun refreshToken(refreshToken: String) = TokenPair(
        accessToken = "mock_access_${UUID.randomUUID()}",
        refreshToken = "mock_refresh_${UUID.randomUUID()}",
        expiresInSeconds = 3600,
    )

    override suspend fun revokeConsent(externalConsentId: String, accessToken: String) {
        // no-op in mock
    }

    override suspend fun getAccounts(accessToken: String) = listOf(
        AccountInfo(
            externalId = "mock-account-001",
            accountType = "CURRENT",
            maskedNumber = "**** **** 1234",
            holderName = "Test Parent",
            currency = "UZS",
        )
    )

    override suspend fun getBalance(accessToken: String, externalAccountId: String) = BalanceInfo(
        externalAccountId = externalAccountId,
        availableAmount = BigDecimal("5000000.00"),  // 50,000 UZS
        currency = "UZS",
    )

    override suspend fun getTransactionHistory(
        accessToken: String,
        externalAccountId: String,
        request: TransactionHistoryRequest,
    ) = listOf(
        TransactionRecord(
            externalId = UUID.randomUUID().toString(),
            amount = BigDecimal("100000.00"),
            currency = "UZS",
            direction = "DEBIT",
            merchantName = "Korzinka",
            description = "Grocery purchase",
            executedAt = Instant.now().minusSeconds(3600),
        )
    )

    override suspend fun initiatePayment(request: PaymentRequest) = PaymentResponse(
        externalPaymentId = UUID.randomUUID().toString(),
        status = PaymentStatus.COMPLETED,
    )

    override suspend fun getPaymentStatus(accessToken: String, externalPaymentId: String) =
        PaymentStatus.COMPLETED
}
