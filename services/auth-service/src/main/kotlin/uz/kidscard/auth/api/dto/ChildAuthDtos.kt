package uz.kidscard.auth.api.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import java.util.UUID

data class CreateChildAccessRequest(
    @field:NotNull val childId: UUID,
    @field:NotNull val familyId: UUID,
    @field:NotBlank
    @field:Pattern(regexp = "\\d{4,6}", message = "PIN must be 4–6 digits")
    val pin: String,
    val displayName: String? = null,
)

data class ChildAccessResponse(
    val childId: UUID,
    val loginCode: String,
    val displayName: String?,
)

data class ChildLoginRequest(
    @field:NotBlank val loginCode: String,
    @field:NotBlank val pin: String,
)

data class ChildTokenResponse(
    val accessToken: String,
    val childId: UUID,
    val familyId: UUID,
    val displayName: String?,
    val expiresIn: Long = 900,
    val tokenType: String = "Bearer",
)
