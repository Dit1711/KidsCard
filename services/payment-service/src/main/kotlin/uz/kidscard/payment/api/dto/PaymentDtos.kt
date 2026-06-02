package uz.kidscard.payment.api.dto

import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import uz.kidscard.payment.domain.Dispute
import uz.kidscard.payment.domain.DisputeReason
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

/** Card-to-card transfer within a family. */
data class TransferRequest(
    @field:NotNull val fromCardId: UUID,
    @field:NotNull val toCardId: UUID,
    @field:NotNull val fromChildId: UUID,
    @field:NotNull val toChildId: UUID,
    @field:NotNull val familyId: UUID,
    @field:Min(100) val amountUzs: Long,
    val description: String? = null,
    @field:NotBlank val idempotencyKey: String,
)

/** Withdraw from a card to a linked bank account (payout). */
data class PayoutRequest(
    @field:NotNull val cardId: UUID,
    @field:NotNull val childId: UUID,
    @field:NotNull val familyId: UUID,
    @field:NotNull val accountId: UUID,
    @field:Min(100) val amountUzs: Long,
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

data class WalletDto(
    val familyId: UUID,
    val balanceUzs: Long,
    val heldUzs: Long,
    val availableUzs: Long,
    val currency: String = "UZS",
)

data class FundWalletRequest(
    val familyId: UUID,
    val amountUzs: Long,
)

data class HoldRequest(
    val familyId: UUID,
    val reference: String,
    val amountUzs: Long,
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

// ── Disputes ─────────────────────────────────────────────────────────────────

data class RaiseDisputeRequest(
    @field:NotNull val transactionId: UUID,
    @field:NotNull val reason: DisputeReason,
    val description: String? = null,
)

data class DisputeDto(
    val id: UUID,
    val transactionId: UUID,
    val familyId: UUID?,
    val childId: UUID?,
    val reason: String,
    val description: String?,
    val status: String,
    val resolution: String?,
    val createdAt: Instant,
    val updatedAt: Instant,
    // transaction snapshot for display (null if the tx was purged)
    val txAmountUzs: Long?,
    val txMerchantName: String?,
    val txCreatedAt: Instant?,
)

fun Dispute.toDto(tx: Transaction? = null) = DisputeDto(
    id = id,
    transactionId = transactionId,
    familyId = familyId,
    childId = childId,
    reason = reason.name,
    description = description,
    status = status.name,
    resolution = resolution,
    createdAt = createdAt,
    updatedAt = updatedAt,
    txAmountUzs = tx?.amountUzs,
    txMerchantName = tx?.merchantName,
    txCreatedAt = tx?.createdAt,
)
