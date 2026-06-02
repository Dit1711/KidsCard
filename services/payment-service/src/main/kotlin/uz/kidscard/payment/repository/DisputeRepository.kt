package uz.kidscard.payment.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.payment.domain.Dispute
import uz.kidscard.payment.domain.DisputeStatus
import java.util.UUID

interface DisputeRepository : JpaRepository<Dispute, UUID> {

    fun findByFamilyIdOrderByCreatedAtDesc(familyId: UUID): List<Dispute>

    fun findByTransactionIdOrderByCreatedAtDesc(transactionId: UUID): List<Dispute>

    fun findByTransactionIdInOrderByCreatedAtDesc(transactionIds: Collection<UUID>): List<Dispute>

    fun existsByTransactionIdAndStatusIn(transactionId: UUID, statuses: Collection<DisputeStatus>): Boolean
}
