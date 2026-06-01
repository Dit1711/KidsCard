package uz.kidscard.auth.service

import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.auth.api.dto.ChildAccessResponse
import uz.kidscard.auth.api.dto.ChildTokenResponse
import uz.kidscard.auth.domain.ChildCredential
import uz.kidscard.auth.repository.ChildCredentialRepository
import uz.kidscard.common.exception.BusinessException
import java.time.Instant
import java.util.UUID
import kotlin.random.Random

@Service
@Transactional
class ChildAuthService(
    private val childCredentialRepository: ChildCredentialRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtService: JwtService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    // Unambiguous alphabet (no 0/O/1/I) for codes a kid types in.
    private val codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

    /** Parent creates or resets the child's login. Returns the login code. */
    fun createAccess(childId: UUID, familyId: UUID, pin: String, displayName: String?): ChildAccessResponse {
        val existing = childCredentialRepository.findByChildId(childId).orElse(null)
        val pinHash = passwordEncoder.encode(pin)

        val credential = if (existing != null) {
            existing.pinHash = pinHash
            existing.displayName = displayName ?: existing.displayName
            existing.active = true
            existing.updatedAt = Instant.now()
            existing
        } else {
            ChildCredential(
                childId = childId,
                familyId = familyId,
                loginCode = generateUniqueCode(),
                pinHash = pinHash,
                displayName = displayName,
            )
        }
        childCredentialRepository.save(credential)
        log.info("Child access {} for childId={} code={}", if (existing != null) "reset" else "created", childId, credential.loginCode)
        return ChildAccessResponse(childId, credential.loginCode, credential.displayName)
    }

    @Transactional(readOnly = true)
    fun getAccess(childId: UUID): ChildAccessResponse? =
        childCredentialRepository.findByChildId(childId).orElse(null)
            ?.let { ChildAccessResponse(it.childId, it.loginCode, it.displayName) }

    fun login(loginCode: String, pin: String): ChildTokenResponse {
        val credential = childCredentialRepository.findByLoginCode(loginCode.uppercase().trim())
            .orElseThrow { BusinessException("INVALID_CREDENTIALS", "Неверный код или PIN", HttpStatus.UNAUTHORIZED) }

        if (!credential.active || !passwordEncoder.matches(pin, credential.pinHash)) {
            throw BusinessException("INVALID_CREDENTIALS", "Неверный код или PIN", HttpStatus.UNAUTHORIZED)
        }

        credential.lastLoginAt = Instant.now()
        childCredentialRepository.save(credential)

        val token = jwtService.generateChildToken(credential.childId, credential.familyId)
        log.info("Child logged in: childId={}", credential.childId)
        return ChildTokenResponse(
            accessToken = token,
            childId = credential.childId,
            familyId = credential.familyId,
            displayName = credential.displayName,
        )
    }

    private fun generateUniqueCode(): String {
        repeat(10) {
            val code = (1..6).map { codeAlphabet[Random.nextInt(codeAlphabet.length)] }.joinToString("")
            if (!childCredentialRepository.existsByLoginCode(code)) return code
        }
        throw BusinessException("CODE_GEN_FAILED", "Не удалось сгенерировать код", HttpStatus.INTERNAL_SERVER_ERROR)
    }
}
