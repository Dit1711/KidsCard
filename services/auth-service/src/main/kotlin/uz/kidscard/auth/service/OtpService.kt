package uz.kidscard.auth.service

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.auth.domain.OtpCode
import uz.kidscard.auth.domain.OtpPurpose
import uz.kidscard.auth.repository.OtpCodeRepository
import uz.kidscard.common.exception.BusinessException
import java.time.Instant
import java.time.temporal.ChronoUnit
import kotlin.random.Random

@Service
class OtpService(
    private val otpCodeRepository: OtpCodeRepository,
    private val passwordEncoder: PasswordEncoder,
    @Value("\${app.otp.expiry-minutes:10}") private val expiryMinutes: Long,
    @Value("\${app.otp.max-attempts:5}") private val maxAttempts: Int,
    @Value("\${app.otp.rate-limit-per-hour:3}") private val rateLimitPerHour: Int,
    @Value("\${app.otp.dev-fixed-code:}") private val devFixedCode: String,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Transactional
    fun sendOtp(phone: String, purpose: OtpPurpose) {
        val oneHourAgo = Instant.now().minus(1, ChronoUnit.HOURS)
        val recentCount = otpCodeRepository.countRecentByPhone(phone, oneHourAgo)

        if (recentCount >= rateLimitPerHour) {
            log.warn("OTP rate limit exceeded for phone={} purpose={}", phone, purpose)
            throw BusinessException("OTP_RATE_LIMIT", "Too many OTP requests. Try again later.")
        }

        val rawCode = generateCode()
        val codeHash = passwordEncoder.encode(rawCode)
        val expiresAt = Instant.now().plus(expiryMinutes, ChronoUnit.MINUTES)

        val otpCode = OtpCode(
            phone = phone,
            codeHash = codeHash,
            purpose = purpose,
            expiresAt = expiresAt,
        )
        otpCodeRepository.save(otpCode)

        // In production this would delegate to SMS gateway; log for dev
        log.info("OTP for {}: {}", phone, rawCode)
    }

    @Transactional
    fun verifyOtp(phone: String, code: String, purpose: OtpPurpose): Boolean {
        val activeCodes = otpCodeRepository.findActive(phone, purpose, Instant.now())

        if (activeCodes.isEmpty()) {
            log.debug("No active OTP found for phone={} purpose={}", phone, purpose)
            throw BusinessException("INVALID_OTP", "Invalid or expired OTP code.")
        }

        // Check against the most recent active OTP first
        for (otpCode in activeCodes) {
            if (otpCode.attempts >= maxAttempts) {
                otpCode.used = true
                otpCodeRepository.save(otpCode)
                continue
            }

            otpCode.attempts++

            if (passwordEncoder.matches(code, otpCode.codeHash)) {
                otpCode.used = true
                otpCodeRepository.save(otpCode)
                log.debug("OTP verified successfully for phone={} purpose={}", phone, purpose)
                return true
            }

            if (otpCode.attempts >= maxAttempts) {
                otpCode.used = true
                log.warn("OTP exhausted max attempts for phone={} purpose={}", phone, purpose)
            }
            otpCodeRepository.save(otpCode)
        }

        throw BusinessException("INVALID_OTP", "Invalid or expired OTP code.")
    }

    private fun generateCode(): String =
        if (devFixedCode.isNotBlank()) devFixedCode else Random.nextInt(100_000, 1_000_000).toString()
}
