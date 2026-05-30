package uz.kidscard.payment.service

import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.stereotype.Service
import uz.kidscard.payment.api.dto.TopUpRequest
import java.util.UUID

/**
 * Consumes card.events from card-service.
 * When eventType == "card.allowance.due", creates a TOPUP transaction
 * so the child's ledger balance is credited automatically.
 *
 * Payload format (sent by card-service AllowanceService):
 * {
 *   "eventType": "card.allowance.due",
 *   "scheduleId": "...",
 *   "cardId": "...",
 *   "childId": "...",
 *   "familyId": "...",
 *   "amountUzs": 50000,
 *   "frequency": "WEEKLY",
 *   "triggeredAt": "..."
 * }
 */
@Service
class AllowanceConsumer(
    private val transactionService: TransactionService,
    private val objectMapper: ObjectMapper,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @KafkaListener(topics = ["card.events"], groupId = "payment-service")
    fun onCardEvent(payload: String) {
        var node = try {
            objectMapper.readTree(payload)
        } catch (ex: Exception) {
            log.warn("Cannot parse card event: {}", payload.take(100))
            return
        }

        // Producer (card-service) uses JsonSerializer on an already-serialized String,
        // so the message arrives double-encoded as a JSON string. Unwrap if needed.
        if (node.isTextual) {
            node = try {
                objectMapper.readTree(node.asText())
            } catch (ex: Exception) {
                log.warn("Cannot parse unwrapped card event")
                return
            }
        }

        val eventType = node.get("eventType")?.asText() ?: return
        if (eventType != "card.allowance.due") return

        val cardId = node.get("cardId")?.asText()?.let { runCatching { UUID.fromString(it) }.getOrNull() } ?: return
        val childId = node.get("childId")?.asText()?.let { runCatching { UUID.fromString(it) }.getOrNull() } ?: return
        val familyId = node.get("familyId")?.asText()?.let { runCatching { UUID.fromString(it) }.getOrNull() } ?: return
        val amountUzs = node.get("amountUzs")?.asLong() ?: return
        val scheduleId = node.get("scheduleId")?.asText() ?: UUID.randomUUID().toString()

        log.info("Allowance due: cardId={} childId={} amount={}", cardId, childId, amountUzs)

        try {
            val result = transactionService.topUp(
                TopUpRequest(
                    cardId = cardId,
                    childId = childId,
                    familyId = familyId,
                    amountUzs = amountUzs,
                    description = "Карманные деньги (автоматически)",
                    idempotencyKey = "allowance-$scheduleId",
                )
            )
            log.info("Allowance top-up OK: cardId={} amount={} newBalance={}", cardId, amountUzs, result.balanceAfter)
        } catch (ex: Exception) {
            log.error("Allowance top-up failed: cardId={} error={}", cardId, ex.message)
        }
    }
}
