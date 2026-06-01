package uz.kidscard.kyc.service

import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.common.exception.BusinessException
import uz.kidscard.common.exception.ResourceNotFoundException
import uz.kidscard.kyc.api.dto.SessionDto
import uz.kidscard.kyc.api.dto.toDto
import uz.kidscard.kyc.domain.DocumentStatus
import uz.kidscard.kyc.domain.DocumentType
import uz.kidscard.kyc.domain.KycDocument
import uz.kidscard.kyc.domain.LivenessCheck
import uz.kidscard.kyc.domain.VerificationSession
import uz.kidscard.kyc.domain.VerificationStatus
import uz.kidscard.kyc.domain.VerificationType
import uz.kidscard.kyc.provider.KycProvider
import uz.kidscard.kyc.repository.KycDocumentRepository
import uz.kidscard.kyc.repository.LivenessCheckRepository
import uz.kidscard.kyc.repository.VerificationSessionRepository
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

@Service
@Transactional
class KycService(
    private val sessionRepository: VerificationSessionRepository,
    private val documentRepository: KycDocumentRepository,
    private val livenessRepository: LivenessCheckRepository,
    private val provider: KycProvider,
    private val outboxService: OutboxService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun startSession(userId: UUID, type: VerificationType): SessionDto {
        // Reuse an in-flight session if one is still open (idempotent restart).
        val existing = sessionRepository.findFirstByUserIdOrderByCreatedAtDesc(userId)
        if (existing != null && existing.status == VerificationStatus.APPROVED) {
            throw BusinessException("ALREADY_VERIFIED", "User is already verified", HttpStatus.CONFLICT)
        }
        if (existing != null && existing.status !in TERMINAL && existing.expiresAt.isAfter(Instant.now())) {
            return existing.toDto()
        }

        val session = VerificationSession(
            userId = userId,
            type = type,
            provider = provider.name,
            expiresAt = Instant.now().plus(24, ChronoUnit.HOURS),
        )
        sessionRepository.save(session)
        log.info("KYC session started: id={} userId={} type={}", session.id, userId, type)
        return session.toDto()
    }

    fun uploadDocument(
        sessionId: UUID,
        userId: UUID,
        docType: DocumentType,
        frontUrl: String?,
        backUrl: String?,
    ): SessionDto {
        val session = requireOwnedSession(sessionId, userId)
        ensureActive(session)

        documentRepository.save(
            KycDocument(
                sessionId = sessionId,
                docType = docType,
                frontUrl = frontUrl,
                backUrl = backUrl,
                status = DocumentStatus.VERIFIED, // mock OCR passes
            ),
        )

        session.status = VerificationStatus.DOCUMENTS_UPLOADED
        session.updatedAt = Instant.now()
        sessionRepository.save(session)
        log.info("KYC document uploaded: sessionId={} docType={}", sessionId, docType)
        return session.toDto()
    }

    fun submitLiveness(sessionId: UUID, userId: UUID, videoUrl: String?): SessionDto {
        val session = requireOwnedSession(sessionId, userId)
        ensureActive(session)

        if (session.status != VerificationStatus.DOCUMENTS_UPLOADED &&
            session.status != VerificationStatus.LIVENESS_DONE
        ) {
            throw BusinessException(
                "DOCUMENTS_REQUIRED",
                "Upload an identity document before the liveness check",
                HttpStatus.UNPROCESSABLE_ENTITY,
            )
        }

        val result = provider.verifyLiveness(videoUrl)
        livenessRepository.save(
            LivenessCheck(
                sessionId = sessionId,
                videoUrl = videoUrl,
                similarityScore = result.similarityScore,
                status = if (result.passed) DocumentStatus.VERIFIED else DocumentStatus.REJECTED,
            ),
        )

        if (!result.passed) {
            session.status = VerificationStatus.REJECTED
            session.rejectionReason = "Liveness check failed"
            session.rejectedAt = Instant.now()
            session.updatedAt = Instant.now()
            sessionRepository.save(session)
            log.warn("KYC rejected (liveness) for userId={}", userId)
            return session.toDto()
        }

        // Mock provider auto-approves once liveness passes.
        session.status = VerificationStatus.APPROVED
        session.approvedAt = Instant.now()
        session.updatedAt = Instant.now()
        sessionRepository.save(session)

        outboxService.publish(
            aggregateType = "VerificationSession",
            aggregateId = session.id.toString(),
            eventType = "kyc.session.approved",
            topic = "kyc.events",
            payload = mapOf(
                "eventType" to "kyc.session.approved",
                "sessionId" to session.id,
                "userId" to userId,
                "type" to session.type.name,
                "approvedAt" to session.approvedAt,
            ),
        )

        log.info("KYC approved for userId={} sessionId={}", userId, session.id)
        return session.toDto()
    }

    @Transactional(readOnly = true)
    fun getStatus(userId: UUID): SessionDto? =
        sessionRepository.findFirstByUserIdOrderByCreatedAtDesc(userId)?.toDto()

    private fun requireOwnedSession(sessionId: UUID, userId: UUID): VerificationSession {
        val session = sessionRepository.findById(sessionId)
            .orElseThrow { ResourceNotFoundException("VerificationSession", sessionId) }
        if (session.userId != userId) {
            throw BusinessException("FORBIDDEN", "Session does not belong to user", HttpStatus.FORBIDDEN)
        }
        return session
    }

    private fun ensureActive(session: VerificationSession) {
        if (session.status in TERMINAL) {
            throw BusinessException("SESSION_CLOSED", "Verification session is already ${session.status}", HttpStatus.CONFLICT)
        }
        if (session.expiresAt.isBefore(Instant.now())) {
            session.status = VerificationStatus.EXPIRED
            sessionRepository.save(session)
            throw BusinessException("SESSION_EXPIRED", "Verification session has expired", HttpStatus.GONE)
        }
    }

    companion object {
        private val TERMINAL = setOf(
            VerificationStatus.APPROVED,
            VerificationStatus.REJECTED,
            VerificationStatus.EXPIRED,
        )
    }
}
