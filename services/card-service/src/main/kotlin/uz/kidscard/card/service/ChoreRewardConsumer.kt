package uz.kidscard.card.service

import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.stereotype.Service
import uz.kidscard.card.domain.CardStatus
import uz.kidscard.card.repository.KidsCardRepository
import java.util.UUID

/**
 * Bridges a completed chore to a card reward. card-service is the only service
 * that knows a child's card, so it resolves childId → active card and re-emits
 * card.chore.reward (with cardId) which payment-service credits to the ledger.
 */
@Service
class ChoreRewardConsumer(
    private val kidsCardRepository: KidsCardRepository,
    private val outboxService: OutboxService,
    private val objectMapper: ObjectMapper,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @KafkaListener(topics = ["family.events"], groupId = "card-service")
    fun onFamilyEvent(payload: String) {
        var node = try {
            objectMapper.readTree(payload)
        } catch (ex: Exception) {
            log.warn("Cannot parse family event: {}", payload.take(100)); return
        }
        if (node.isTextual) {
            node = try {
                objectMapper.readTree(node.asText())
            } catch (ex: Exception) {
                log.warn("Cannot parse unwrapped family event"); return
            }
        }

        if (node.get("eventType")?.asText() != "family.chore.completed") return

        val childId = node.uuid("childId") ?: return
        val familyId = node.uuid("familyId") ?: return
        val reward = node.get("rewardAmount")?.asLong() ?: 0
        val choreId = node.get("choreId")?.asText() ?: UUID.randomUUID().toString()
        val title = node.get("title")?.takeIf { !it.isNull }?.asText() ?: "Задание"

        if (reward <= 0) {
            log.debug("Chore {} approved with no reward, skipping credit", choreId)
            return
        }

        val card = kidsCardRepository.findByChildIdAndStatusOrderByCreatedAtAsc(childId, CardStatus.ACTIVE).firstOrNull()
        if (card == null) {
            log.warn("Chore reward: no active card for childId={}", childId)
            return
        }

        outboxService.publish(
            aggregateType = "Chore",
            aggregateId = choreId,
            eventType = "card.chore.reward",
            topic = "card.events",
            payload = mapOf(
                "eventType" to "card.chore.reward",
                "choreId" to choreId,
                "cardId" to card.id,
                "childId" to childId,
                "familyId" to familyId,
                "amountUzs" to reward,
                "title" to title,
            ),
        )
        log.info("Chore reward queued: choreId={} card={} amount={}", choreId, card.id, reward)
    }

    private fun com.fasterxml.jackson.databind.JsonNode.uuid(field: String): UUID? =
        get(field)?.takeIf { !it.isNull }?.asText()?.let { runCatching { UUID.fromString(it) }.getOrNull() }
}
