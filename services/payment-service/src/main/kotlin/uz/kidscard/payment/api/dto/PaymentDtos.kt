package uz.kidscard.payment.api.dto

import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import uz.kidscard.payment.domain.Transaction
import java.time.Instant
import java.util.UUID

// ── Requests ─────────────────────────────────────────────────────────────────

data class TopUpRequest(
    @field:NotNull val cardId: UUID,
    @field:NotNull val childId: UUID,
    @field:NotNull val familyId: UUID,
    @field:Min(100) val amountUzs: Long,        // minimum 100 tiyin = 1 UZS
    val description: String? = null,
    @field:NotBlank val idempotencyKey: String,
)

data class PurchaseRequest(
    @field:NotNull val cardId: UUID,
    @field:NotNull val childId: UUID,
    @field:NotNull val familyId: UUID,
    @field:Min(100) val amountUzs: Long,
    val merchantName: String? = null,
    val merchantMcc: String? = null,
    val description: String? = null,
    @field:NotBlank val idempotencyKey: String,
)

// ── Responses ─────────────────────────────────────────────────────────────────

data class TransactionDto(
    val id: UUID,
    val idempotencyKey: String,
    val cardId: UUID,
    val childId: UUID,
    val familyId: UUID,
    val type: String,
    val status: String,
    val amountUzs: Long,
    val currency: String,
    val direction: String,
    val merchantName: String?,
    val description: String?,
    val balanceAfter: Long,
    val createdAt: Instant,
)

data class BalanceDto(
    val cardId: UUID,
    val balanceUzs: Long,
    val currency: String = "UZS",
)

data class PageDto<T>(
    val content: List<T>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
)

// ── Extension functions ───────────────────────────────────────────────────────

fun Transaction.toDto(balanceAfter: Long) = TransactionDto(
    id = id,
    idempotencyKey = idempotencyKey,
    cardId = cardId,
    childId = childId,
    familyId = familyId,
    type = type.name,
    status = status.name,
    amountUzs = amountUzs,
    currency = currency,
    direction = direction.name,
    merchantName = merchantName,
    description = description,
    balanceAfter = balanceAfter,
    createdAt = createdAt,
)
