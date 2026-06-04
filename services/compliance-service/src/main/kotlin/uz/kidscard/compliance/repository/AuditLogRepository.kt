package uz.kidscard.compliance.repository

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.compliance.domain.AuditLog
import java.util.UUID

interface AuditLogRepository : JpaRepository<AuditLog, UUID> {

    /** The most recent entry — its hash is the [prev_hash] of the next append. */
    fun findTopByOrderBySeqDesc(): AuditLog?

    fun findAllByOrderBySeqDesc(pageable: Pageable): Page<AuditLog>

    fun findByFamilyIdOrderBySeqDesc(familyId: UUID, pageable: Pageable): Page<AuditLog>

    fun findByEventTypeOrderBySeqDesc(eventType: String, pageable: Pageable): Page<AuditLog>
}
