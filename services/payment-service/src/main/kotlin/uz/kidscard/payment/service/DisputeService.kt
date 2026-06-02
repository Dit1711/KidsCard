package uz.kidscard.payment.service

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.common.exception.BusinessException
import uz.kidscard.common.exception.ConflictException
import uz.kidscard.common.exception.ResourceNotFoundException
import uz.kidscard.payment.api.dto.DisputeDto
import uz.kidscard.payment.api.dto.RaiseDisputeRequest
import uz.kidscard.payment.api.dto.toDto
import uz.kidscard.payment.domain.Dispute
import uz.kidscard.payment.domain.DisputeStatus
import uz.kidscard.payment.repository.DisputeRepository
import uz.kidscard.payment.repository.TransactionRepository
import java.time.Instant
import java.util.UUID

@Service
@Transactional
class DisputeService(
    private val disputeRepository: DisputeRepository,
    private val transactionRepository: TransactionRepository,
    private val outboxService: OutboxService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    private val openStatuses = listOf(DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW)

    /** A parent raises a dispute against one of their child's transactions. */
    fun raise(req: RaiseDisputeRequest, raisedBy: UUID): DisputeDto {
        val tx = transactionRepository.findById(req.transactionId)
            .orElseThrow { ResourceNotFoundException("Transaction", req.transactionId) }

        if (disputeRepository.existsByTransactionIdAndStatusIn(tx.id, openStatuses)) {
            throw ConflictException("DISPUTE_ALREADY_OPEN", "По этой операции уже открыт спор")
        }

        val dispute = disputeRepository.save(
            Dispute(
                transactionId = tx.id,
                familyId = tx.familyId,
                childId = tx.childId,
                raisedBy = raisedBy,
                reason = req.reason,
                description = req.description?.takeIf { it.isNotBlank() },
            ),
        )
        log.info("Dispute raised: id={} tx={} reason={} by={}", dispute.id, tx.id, req.reason, raisedBy)

        outboxService.publish(
            aggregateType = "Dispute",
            aggregateId = dispute.id.toString(),
            eventType = "payment.dispute.raised",
            topic = "payment.events",
            payload = mapOf(
                "eventType" to "payment.dispute.raised",
                "disputeId" to dispute.id,
                "transactionId" to tx.id,
                "familyId" to tx.familyId,
                "childId" to tx.childId,
                "raisedBy" to raisedBy,
                "reason" to req.reason.name,
                "amountUzs" to tx.amountUzs,
                "merchantName" to tx.merchantName,
                "createdAt" to dispute.createdAt,
            ),
        )
        return dispute.toDto(tx)
    }

    @Transactional(readOnly = true)
    fun listByFamily(familyId: UUID): List<DisputeDto> {
        val disputes = disputeRepository.findByFamilyIdOrderByCreatedAtDesc(familyId)
        if (disputes.isEmpty()) return emptyList()
        val txById = transactionRepository.findAllById(disputes.map { it.transactionId })
            .associateBy { it.id }
        return disputes.map { it.toDto(txById[it.transactionId]) }
    }

    @Transactional(readOnly = true)
    fun getByTransaction(transactionId: UUID): List<DisputeDto> {
        val disputes = disputeRepository.findByTransactionIdOrderByCreatedAtDesc(transactionId)
        if (disputes.isEmpty()) return emptyList()
        val tx = transactionRepository.findById(transactionId).orElse(null)
        return disputes.map { it.toDto(tx) }
    }

    /** A parent withdraws a dispute they raised while it is still open. */
    fun withdraw(disputeId: UUID, userId: UUID): DisputeDto {
        val dispute = disputeRepository.findById(disputeId)
            .orElseThrow { ResourceNotFoundException("Dispute", disputeId) }
        if (dispute.raisedBy != userId) {
            throw BusinessException("DISPUTE_FORBIDDEN", "Можно отозвать только свой спор")
        }
        if (dispute.status !in openStatuses) {
            throw ConflictException("DISPUTE_NOT_OPEN", "Спор уже закрыт")
        }
        dispute.status = DisputeStatus.REJECTED
        dispute.resolution = "Отозвано родителем"
        dispute.updatedAt = Instant.now()
        disputeRepository.save(dispute)
        log.info("Dispute withdrawn: id={} by={}", disputeId, userId)

        val tx = transactionRepository.findById(dispute.transactionId).orElse(null)
        return dispute.toDto(tx)
    }
}
