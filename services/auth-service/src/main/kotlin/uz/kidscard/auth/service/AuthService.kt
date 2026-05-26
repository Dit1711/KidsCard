package uz.kidscard.auth.service

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.auth.api.dto.TokenResponse
import uz.kidscard.auth.domain.OtpPurpose
import uz.kidscard.auth.domain.RefreshToken
import uz.kidscard.auth.domain.Role
import uz.kidscard.auth.domain.User
import uz.kidscard.auth.domain.UserRole
import uz.kidscard.auth.domain.UserRoleId
import uz.kidscard.auth.repository.RefreshTokenRepository
import uz.kidscard.auth.repository.UserRepository
import uz.kidscard.common.exception.BusinessException
import uz.kidscard.common.exception.ResourceNotFoundException
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

@Service
@Transactional
class AuthService(
    private val userRepository: UserRepository,
    private val refreshTokenRepository: RefreshTokenRepository,
    private val otpService: OtpService,
    private val jwtService: JwtService,
    @Value("\${app.jwt.refresh-token-expiry:2592000}") private val refreshTokenExpirySeconds: Long,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun register(phone: String) {
        if (!userRepository.existsByPhone(phone)) {
            val user = User(phone = phone)
            userRepository.save(user)
            log.info("New user registered with phone={}", phone)
        } else {
            log.debug("Registration OTP requested for existing phone={}", phone)
        }
        otpService.sendOtp(phone, OtpPurpose.REGISTRATION)
    }

    fun verifyRegistration(phone: String, otp: String): TokenResponse {
        val user = userRepository.findByPhone(phone)
            .orElseThrow { ResourceNotFoundException("User", phone) }

        otpService.verifyOtp(phone, otp, OtpPurpose.REGISTRATION)

        user.phoneVerified = true

        if (user.roles.none { it.id.role == Role.PARENT_OWNER }) {
            val roleId = UserRoleId(userId = user.id, role = Role.PARENT_OWNER)
            val userRole = UserRole(id = roleId, user = user)
            user.roles.add(userRole)
        }

        userRepository.save(user)
        log.info("User phone verified and PARENT_OWNER role assigned for userId={}", user.id)

        return issueTokens(user)
    }

    fun login(phone: String) {
        userRepository.findByPhone(phone)
            .orElseThrow { ResourceNotFoundException("User", phone) }
        otpService.sendOtp(phone, OtpPurpose.LOGIN)
    }

    fun verifyLogin(phone: String, otp: String, deviceId: String?): TokenResponse {
        val user = userRepository.findByPhone(phone)
            .orElseThrow { ResourceNotFoundException("User", phone) }

        otpService.verifyOtp(phone, otp, OtpPurpose.LOGIN)

        user.lastLoginAt = Instant.now()
        userRepository.save(user)

        log.info("User logged in successfully: userId={} deviceId={}", user.id, deviceId)
        return issueTokens(user, deviceId)
    }

    fun refresh(refreshTokenValue: String): TokenResponse {
        val tokenHash = hashToken(refreshTokenValue)
        val refreshToken = refreshTokenRepository.findByTokenHashAndRevokedFalse(tokenHash)
            .orElseThrow { BusinessException("INVALID_TOKEN", "Refresh token not found or already revoked.", HttpStatus.UNAUTHORIZED) }

        if (refreshToken.isExpired()) {
            refreshToken.revoke()
            refreshTokenRepository.save(refreshToken)
            throw BusinessException("TOKEN_EXPIRED", "Refresh token has expired.", HttpStatus.UNAUTHORIZED)
        }

        // Rotate: revoke old token and issue new pair
        refreshToken.revoke()
        refreshTokenRepository.save(refreshToken)

        log.debug("Refresh token rotated for userId={}", refreshToken.user.id)
        return issueTokens(refreshToken.user, refreshToken.deviceId)
    }

    fun logout(refreshTokenValue: String) {
        val tokenHash = hashToken(refreshTokenValue)
        refreshTokenRepository.findByTokenHashAndRevokedFalse(tokenHash).ifPresent { token ->
            token.revoke()
            refreshTokenRepository.save(token)
            log.info("User logged out: userId={}", token.user.id)
        }
    }

    @Transactional(readOnly = true)
    fun getCurrentUser(userId: UUID): User =
        userRepository.findById(userId)
            .orElseThrow { ResourceNotFoundException("User", userId) }

    private fun issueTokens(user: User, deviceId: String? = null): TokenResponse {
        val accessToken = jwtService.generateAccessToken(user)
        val rawRefreshToken = jwtService.generateRefreshTokenValue()
        val tokenHash = hashToken(rawRefreshToken)
        val expiresAt = Instant.now().plus(refreshTokenExpirySeconds, ChronoUnit.SECONDS)

        val refreshToken = RefreshToken(
            user = user,
            tokenHash = tokenHash,
            deviceId = deviceId,
            expiresAt = expiresAt,
        )
        refreshTokenRepository.save(refreshToken)

        return TokenResponse(
            accessToken = accessToken,
            refreshToken = rawRefreshToken,
        )
    }

    private fun hashToken(token: String): String {
        // Use SHA-256 for deterministic lookup — BCrypt is not deterministic so cannot be used for token lookup
        val digest = java.security.MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest(token.toByteArray(Charsets.UTF_8))
        return hashBytes.joinToString("") { "%02x".format(it) }
    }
}
