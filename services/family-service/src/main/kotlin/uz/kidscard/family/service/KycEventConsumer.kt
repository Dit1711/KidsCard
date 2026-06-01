package uz.kidscard.family.service

import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.family.domain.KycStatus
import uz.kidscard.family.repository.ParentRepository
import java.time.Instant
import java.util.UUID

/**
 * Consumes kyc.events. When a verification is approved, marks the matching
 * parent as KYC-approved so the UI's "PENDING" badge clears.
 *
 * Payload (from kyc-service): { "eventType": "kyc.session.approved",
 *   "sessionId": ..., "userId": ..., "type": ..., "approvedAt": ... }
 * The outbox JsonSerializer double-encodes the String payload, so the message
 * may arrive as a JSON string — unwrap the textual node if needed.
 */
@Service
class KycEventConsumer(
    private val parentRepository: ParentRepository,
    private val objectMapper: ObjectMapper,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @KafkaListener(topics = ["kyc.events"], groupId = "family-service")
    @Transactional
    fun onKycEvent(payload: String) {
        var node = try {
            objectMapper.readTree(payload)
        } catch (ex: Exception) {
            log.warn("Cannot parse kyc event: {}", payload.take(100))
            return
        }
        if (node.isTextual) {
            node = try {
                objectMapper.readTree(node.asText())
            } catch (ex: Exception) {
                log.warn("Cannot parse unwrapped kyc event")
                return
            }
        }

        if (node.get("eventType")?.asText() != "kyc.session.approved") return

        val userId = node.get("userId")?.asText()
            ?.let { runCatching { UUID.fromString(it) }.getOrNull() } ?: return

        val parent = parentRepository.findByUserId(userId)
        if (parent == null) {
            log.debug("KYC approved for userId={} but no parent found", userId)
            return
        }

        parent.kycStatus = KycStatus.APPROVED
        parent.kycVerifiedAt = Instant.now()
        parent.updatedAt = Instant.now()
        parentRepository.save(parent)
        log.info("Parent KYC approved: userId={} parentId={}", userId, parent.id)
    }
}
