package uz.kidscard.family.api.dto

import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import uz.kidscard.family.domain.LimitType
import uz.kidscard.family.domain.Recurrence
import java.time.LocalDate
import java.util.UUID

data class CreateFamilyRequest(
    @field:NotBlank val familyName: String,
    @field:NotBlank val fullName: String,
)

data class AddCoParentRequest(
    @field:NotBlank val userId: String,
    @field:NotBlank val phone: String,
    @field:NotBlank val fullName: String,
)

data class InviteCoParentRequest(
    @field:NotBlank val phone: String,
    @field:NotBlank val fullName: String,
)

data class AddChildRequest(
    @field:NotBlank val fullName: String,
    @field:NotNull val dateOfBirth: LocalDate,
    val avatarUrl: String? = null,
)

data class UpdateChildRequest(
    val fullName: String? = null,
    val avatarUrl: String? = null,
)

data class SetLimitRequest(
    @field:NotNull val limitType: LimitType,
    val category: String? = null,
    @field:Min(1) val amountUzs: Long,
)

data class CreateChoreRequest(
    @field:NotBlank val title: String,
    val description: String? = null,
    val childId: UUID,
    val rewardAmount: Long = 0,
    val dueDate: LocalDate? = null,
    val recurrence: Recurrence = Recurrence.NONE,
)
