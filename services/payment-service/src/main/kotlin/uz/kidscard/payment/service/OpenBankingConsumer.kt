package uz.kidscard.payment.service

import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.stereotype.Service
import uz.kidscard.payment.api.dto.TopUpRequest
import java.util.UUID

/**
 * Consumes openbanking.events. When a bank payment completes (PIS), credits the
 * kid's card ledger with a TOPUP — closing the bank-account → card loop.
 * Idempotent per bank-payment idempotency key (shared with the ledger top-up).
 */
@Service
class OpenBankingConsumer(
    private val transactionService: TransactionService,
    private val objectMapper: ObjectMapper,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @KafkaListener(topics = ["openbanking.events"], groupId = "payment-service")
    fun onOpenBankingEvent(payload: String) {
        var node = try {
            objectMapper.readTree(payload)
        } catch (ex: Exception) {
            log.warn("Cannot parse openbanking event: {}", payload.take(100)); return
        }
        if (node.isTextual) {
            node = try {
                objectMapper.readTree(node.asText())
            } catch (ex: Exception) {
                log.warn("Cannot parse unwrapped openbanking event"); return
            }
        }

        if (node.get("eventType")?.asText() != "openbanking.payment.completed") return

        val cardId = node.uuid("cardId") ?: return
        val childId = node.uuid("childId") ?: return
        val familyId = node.uuid("familyId") ?: return
        val amount = node.get("amountUzs")?.asLong() ?: return
        val key = node.get("idempotencyKey")?.asText() ?: return

        try {
            val result = transactionService.topUp(
                TopUpRequest(
                    cardId = cardId,
                    childId = childId,
                    familyId = familyId,
                    amountUzs = amount,
                    description = "Пополнение с банковского счёта",
                    // Distinct key namespace so it never collides with manual top-ups.
                    idempotencyKey = "openbanking-$key",
                ),
            )
            log.info("Bank funding credited: card={} amount={} newBalance={}", cardId, amount, result.balanceAfter)
        } catch (ex: Exception) {
            log.error("Bank funding credit failed: card={} error={}", cardId, ex.message)
        }
    }

    private fun com.fasterxml.jackson.databind.JsonNode.uuid(field: String): UUID? =
        get(field)?.takeIf { !it.isNull }?.asText()?.let { runCatching { UUID.fromString(it) }.getOrNull() }
}
