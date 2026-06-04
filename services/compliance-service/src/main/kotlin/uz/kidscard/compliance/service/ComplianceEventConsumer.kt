package uz.kidscard.compliance.service

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.kafka.support.KafkaHeaders
import org.springframework.messaging.handler.annotation.Header
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID

/**
 * Single source of the audit trail: subscribes to every service's domain-event
 * topic and records each event into the immutable audit log. Because services
 * already publish via the outbox pattern, no producer-side changes are needed.
 */
@Service
class ComplianceEventConsumer(
    private val auditService: AuditService,
    private val amlRuleEngine: AmlRuleEngine,
    private val objectMapper: ObjectMapper,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @KafkaListener(
        topics = [
            "payment.events",
            "card.events",
            "family.events",
            "kyc.events",
            "openbanking.events",
            "savings.events",
        ],
        groupId = "compliance-service",
    )
    fun onEvent(
        payload: String,
        @Header(KafkaHeaders.RECEIVED_TOPIC) topic: String,
    ) {
        val node = parse(payload)
        if (node == null) {
            // Still record the fact that an unparseable event arrived — the audit
            // trail must not have silent gaps.
            auditService.record("unparseable", topic, null, null, jsonString(payload))
            return
        }
        val eventType = node.get("eventType")?.takeIf { !it.isNull }?.asText() ?: "unknown"
        val aggregateId = node.firstUuid("aggregateId", "transactionId", "cardId", "holdId", "disputeId", "id")
        val familyId = node.uuid("familyId")
        auditService.record(eventType, topic, aggregateId, familyId, node.toString())

        // Feed completed transactions to the AML engine. Use the event's own
        // timestamp so windowed rules stay correct when backfilling from Kafka.
        if (eventType == "payment.transaction.completed") {
            runCatching {
                amlRuleEngine.evaluateTransaction(
                    familyId = familyId,
                    childId = node.uuid("childId"),
                    cardId = node.uuid("cardId"),
                    amountUzs = node.get("amountUzs")?.takeIf { !it.isNull }?.asLong() ?: 0L,
                    direction = node.get("direction")?.takeIf { !it.isNull }?.asText() ?: "",
                    type = node.get("type")?.takeIf { !it.isNull }?.asText(),
                    occurredAt = node.instant("createdAt") ?: Instant.now(),
                )
            }.onFailure { log.error("AML evaluation failed for {}: {}", aggregateId, it.message) }
        }
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun parse(payload: String): JsonNode? {
        var node = try {
            objectMapper.readTree(payload)
        } catch (ex: Exception) {
            log.warn("Cannot parse event from {}: {}", "kafka", payload.take(120)); return null
        }
        // Outbox JsonSerializer over an already-serialized String yields a
        // double-encoded JSON string; unwrap it once.
        if (node.isTextual) {
            node = try {
                objectMapper.readTree(node.asText())
            } catch (ex: Exception) {
                return null
            }
        }
        return node
    }

    private fun JsonNode.uuid(field: String): UUID? =
        get(field)?.takeIf { !it.isNull }?.asText()?.let { runCatching { UUID.fromString(it) }.getOrNull() }

    private fun JsonNode.instant(field: String): Instant? =
        get(field)?.takeIf { !it.isNull }?.asText()?.let { runCatching { Instant.parse(it) }.getOrNull() }

    private fun JsonNode.firstUuid(vararg fields: String): UUID? =
        fields.firstNotNullOfOrNull { uuid(it) }

    private fun jsonString(raw: String): String = objectMapper.writeValueAsString(raw)
}
