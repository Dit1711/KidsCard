package uz.kidscard.card.api.dto

import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotNull
import uz.kidscard.card.domain.AllowanceFrequency
import uz.kidscard.card.domain.AllowanceSchedule
import uz.kidscard.card.domain.CardNetwork
import uz.kidscard.card.domain.CardStatus
import uz.kidscard.card.domain.CardType
import uz.kidscard.card.domain.KidsCard
import java.time.Instant
import java.util.UUID

// ── Requests ────────────────────────────────────────────────────────────────

data class IssueCardRequest(
    @field:NotNull val childId: UUID,
    @field:NotNull val cardType: CardType,
    val network: CardNetwork = CardNetwork.UZCARD,
)

data class SetAllowanceRequest(
    @field:Min(1000) val amountUzs: Long,
    @field:NotNull val frequency: AllowanceFrequency,
    val dayOfWeek: Int? = null,
    val dayOfMonth: Int? = null,
)

// ── Responses ────────────────────────────────────────────────────────────────

data class KidsCardDto(
    val id: UUID,
    val childId: UUID,
    val familyId: UUID,
    val cardType: CardType,
    val maskedPan: String,
    val expiryMonth: Int,
    val expiryYear: Int,
    val network: CardNetwork,
    val status: CardStatus,
    val balanceUzs: Long,
    val issuedAt: Instant?,
    val frozenAt: Instant?,
)

data class AllowanceScheduleDto(
    val id: UUID,
    val cardId: UUID,
    val amountUzs: Long,
    val frequency: AllowanceFrequency,
    val dayOfWeek: Int?,
    val dayOfMonth: Int?,
    val active: Boolean,
    val nextRunAt: Instant?,
)

// ── Extension functions ──────────────────────────────────────────────────────

fun KidsCard.toDto() = KidsCardDto(
    id = id,
    childId = childId,
    familyId = familyId,
    cardType = cardType,
    maskedPan = maskedPan,
    expiryMonth = expiryMonth,
    expiryYear = expiryYear,
    network = network,
    status = status,
    balanceUzs = balanceUzs,
    issuedAt = issuedAt,
    frozenAt = frozenAt,
)

fun AllowanceSchedule.toDto() = AllowanceScheduleDto(
    id = id,
    cardId = card.id,
    amountUzs = amountUzs,
    frequency = frequency,
    dayOfWeek = dayOfWeek,
    dayOfMonth = dayOfMonth,
    active = active,
    nextRunAt = nextRunAt,
)
