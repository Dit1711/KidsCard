package uz.kidscard.compliance.service

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.compliance.domain.AuditLog
import uz.kidscard.compliance.repository.AuditLogRepository
import java.security.MessageDigest
import java.time.Instant
import java.util.UUID

/**
 * Appends entries to the immutable, hash-chained audit log.
 *
 * Hash chaining requires sequential appends: the chain is built by the single
 * Kafka consumer thread (one instance, ack-mode=record), which processes records
 * one at a time — so reading "the latest entry" then appending is safe here. A
 * multi-instance deployment would need a DB advisory lock around append().
 */
@Service
class AuditService(
    private val repository: AuditLogRepository,
) {

    @Transactional
    fun record(
        eventType: String,
        topic: String,
        aggregateId: UUID?,
        familyId: UUID?,
        payload: String?,
    ): AuditLog {
        val prevHash = repository.findTopByOrderBySeqDesc()?.entryHash ?: GENESIS
        val createdAt = Instant.now()
        val canonical = listOf(
            prevHash,
            eventType,
            topic,
            aggregateId?.toString() ?: "",
            familyId?.toString() ?: "",
            payload ?: "",
            createdAt.toString(),
        ).joinToString(FIELD_SEP)

        return repository.save(
            AuditLog(
                eventType = eventType,
                topic = topic,
                aggregateId = aggregateId,
                familyId = familyId,
                payload = payload,
                prevHash = prevHash,
                entryHash = sha256(canonical),
                createdAt = createdAt,
            ),
        )
    }

    companion object {
        const val GENESIS = "GENESIS"
        private const val FIELD_SEP = ""

        fun sha256(input: String): String =
            MessageDigest.getInstance("SHA-256")
                .digest(input.toByteArray(Charsets.UTF_8))
                .joinToString("") { "%02x".format(it) }
    }
}
