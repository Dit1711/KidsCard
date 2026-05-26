package uz.kidscard.auth.api.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import uz.kidscard.auth.domain.User
import java.time.Instant
import java.util.UUID

data class RegisterRequest(
    @field:NotBlank
    @field:Pattern(regexp = """\+998\d{9}""", message = "Phone must be in format +998XXXXXXXXX")
    val phone: String,
)

data class VerifyOtpRequest(
    @field:NotBlank
    val phone: String,

    @field:NotBlank
    @field:Size(min = 6, max = 6, message = "OTP must be exactly 6 digits")
    val otp: String,
)

data class LoginRequest(
    @field:NotBlank
    @field:Pattern(regexp = """\+998\d{9}""", message = "Phone must be in format +998XXXXXXXXX")
    val phone: String,
)

data class VerifyLoginRequest(
    @field:NotBlank
    val phone: String,

    @field:NotBlank
    @field:Size(min = 6, max = 6, message = "OTP must be exactly 6 digits")
    val otp: String,

    val deviceId: String? = null,
)

data class RefreshRequest(
    @field:NotBlank
    val refreshToken: String,
)

data class LogoutRequest(
    @field:NotBlank
    val refreshToken: String,
)

data class TokenResponse(
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Long = 900,
    val tokenType: String = "Bearer",
)

data class UserResponse(
    val id: UUID,
    val phone: String,
    val roles: List<String>,
    val phoneVerified: Boolean,
    val createdAt: Instant,
)

fun User.toResponse() = UserResponse(
    id = id,
    phone = phone,
    roles = roles.map { it.id.role.name },
    phoneVerified = phoneVerified,
    createdAt = createdAt,
)
