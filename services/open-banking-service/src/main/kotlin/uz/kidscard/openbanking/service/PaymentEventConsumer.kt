package uz.kidscard.openbanking.service

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.openbanking.repository.LinkedAccountRepository
import java.time.Instant
import java.util.UUID

/**
 * Consumes payment.events. When a card payout completes, credits the linked
 * bank account's cached balance — closing the card → bank-account loop
 * (the mirror of fund-card, which goes account → card).
 */
@Service
class PaymentEventConsumer(
    private val linkedAccountRepository: LinkedAccountRepository,
    private val objectMapper: ObjectMapper,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @KafkaListener(topics = ["payment.events"], groupId = "open-banking-service")
    @Transactional
    fun onPaymentEvent(payload: String) {
        var node = try {
            objectMapper.readTree(payload)
        } catch (ex: Exception) {
            log.warn("Cannot parse payment event: {}", payload.take(100)); return
        }
        if (node.isTextual) {
            node = try { objectMapper.readTree(node.asText()) } catch (ex: Exception) { return }
        }
        if (node.get("eventType")?.asText() != "payment.payout.completed") return

        val accountId = node.uuid("accountId") ?: return
        val amount = node.get("amountUzs")?.asLong() ?: return

        val account = linkedAccountRepository.findById(accountId).orElse(null) ?: run {
            log.warn("Payout credit: linked account not found id={}", accountId); return
        }
        account.balanceUzs = (account.balanceUzs ?: 0) + amount
        account.balanceCachedAt = Instant.now()
        account.updatedAt = Instant.now()
        linkedAccountRepository.save(account)
        log.info("Payout credited to account={} amount={} newBalance={}", accountId, amount, account.balanceUzs)
    }

    private fun JsonNode.uuid(field: String): UUID? =
        get(field)?.takeIf { !it.isNull }?.asText()?.let { runCatching { UUID.fromString(it) }.getOrNull() }
}
