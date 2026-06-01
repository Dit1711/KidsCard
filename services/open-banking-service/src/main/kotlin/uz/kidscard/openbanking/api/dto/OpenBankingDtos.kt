package uz.kidscard.openbanking.api.dto

import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import uz.kidscard.openbanking.domain.BankConsent
import uz.kidscard.openbanking.domain.LinkedAccount
import java.time.Instant
import java.util.UUID

// ── Requests ─────────────────────────────────────────────────────────────────

data class LinkBankRequest(
    @field:NotBlank val bankCode: String,
)

data class FundCardRequest(
    @field:NotNull val accountId: UUID,
    @field:NotNull val cardId: UUID,
    @field:NotNull val childId: UUID,
    @field:NotNull val familyId: UUID,
    @field:Min(1000) val amountUzs: Long,
    val description: String? = null,
    @field:NotBlank val idempotencyKey: String,
)

// ── Responses ─────────────────────────────────────────────────────────────────

data class BankDto(val code: String, val name: String)

data class ConsentDto(
    val id: UUID,
    val bankCode: String,
    val status: String,
    val createdAt: Instant,
)

data class LinkedAccountDto(
    val id: UUID,
    val bankCode: String,
    val accountType: String,
    val maskedNumber: String?,
    val holderName: String?,
    val currency: String,
    val balanceUzs: Long?,
    val status: String,
)

data class FundResultDto(
    val paymentRequestId: UUID,
    val status: String,
    val amountUzs: Long,
    val externalRef: String?,
)

fun BankConsent.toDto() = ConsentDto(id, bankCode, status, createdAt)

fun LinkedAccount.toDto() = LinkedAccountDto(
    id = id,
    bankCode = bankCode,
    accountType = accountType,
    maskedNumber = maskedNumber,
    holderName = holderName,
    currency = currency,
    balanceUzs = balanceUzs,
    status = status,
)
