package uz.kidscard.kyc.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.common.outbox.OutboxEvent
import uz.kidscard.common.outbox.OutboxStatus
import uz.kidscard.kyc.domain.KycDocument
import uz.kidscard.kyc.domain.LivenessCheck
import uz.kidscard.kyc.domain.VerificationSession
import java.util.UUID

interface VerificationSessionRepository : JpaRepository<VerificationSession, UUID> {
    fun findFirstByUserIdOrderByCreatedAtDesc(userId: UUID): VerificationSession?
}

interface KycDocumentRepository : JpaRepository<KycDocument, UUID> {
    fun findBySessionId(sessionId: UUID): List<KycDocument>
}

interface LivenessCheckRepository : JpaRepository<LivenessCheck, UUID> {
    fun findBySessionId(sessionId: UUID): List<LivenessCheck>
}

interface OutboxEventRepository : JpaRepository<OutboxEvent, UUID> {
    fun findTop50ByStatusOrderByCreatedAt(status: OutboxStatus): List<OutboxEvent>
}
