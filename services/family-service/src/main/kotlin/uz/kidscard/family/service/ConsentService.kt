package uz.kidscard.family.service

import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.common.exception.BusinessException
import uz.kidscard.family.domain.Consent
import uz.kidscard.family.domain.ConsentType
import uz.kidscard.family.repository.ConsentRepository
import java.util.UUID

/** A parent's consent state at the currently required document version. */
data class ConsentStatus(
    val version: String,
    val required: List<ConsentType>,
    val granted: List<ConsentType>,
    val allGranted: Boolean,
)

@Service
@Transactional
class ConsentService(
    private val consentRepository: ConsentRepository,
    @Value("\${app.consent.version:1.0}") private val requiredVersion: String,
) {
    private val requiredTypes = ConsentType.entries

    @Transactional(readOnly = true)
    fun status(userId: UUID): ConsentStatus {
        val granted = requiredTypes.filter {
            consentRepository.existsByUserIdAndTypeAndVersion(userId, it, requiredVersion)
        }
        return ConsentStatus(requiredVersion, requiredTypes, granted, granted.size == requiredTypes.size)
    }

    /** Record acceptance of the given documents at the current version (idempotent). */
    fun record(userId: UUID, types: List<ConsentType>, ip: String?, userAgent: String?): ConsentStatus {
        types.distinct().forEach { type ->
            if (!consentRepository.existsByUserIdAndTypeAndVersion(userId, type, requiredVersion)) {
                consentRepository.save(
                    Consent(
                        userId = userId,
                        type = type,
                        version = requiredVersion,
                        ipAddress = ip,
                        userAgent = userAgent?.take(512),
                    ),
                )
            }
        }
        return status(userId)
    }

    /** Gate: throws unless every required document is accepted at the current version. */
    @Transactional(readOnly = true)
    fun requireAllConsents(userId: UUID) {
        if (!status(userId).allGranted) {
            throw BusinessException(
                "CONSENT_REQUIRED",
                "Необходимо принять пользовательское соглашение, политику конфиденциальности и согласие на обработку данных ребёнка",
                HttpStatus.FORBIDDEN,
            )
        }
    }
}
