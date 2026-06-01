package uz.kidscard.family.service

import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.family.domain.GoalStatus
import uz.kidscard.family.repository.SavingsGoalRepository
import java.time.Instant
import java.util.UUID

/**
 * Applies interest accrued in payment-service to the goal's currentAmount so
 * the kid sees their savings grow.
 */
@Service
class SavingsInterestConsumer(
    private val savingsGoalRepository: SavingsGoalRepository,
    private val objectMapper: ObjectMapper,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @KafkaListener(topics = ["savings.events"], groupId = "family-service")
    @Transactional
    fun onSavingsEvent(payload: String) {
        var node = try {
            objectMapper.readTree(payload)
        } catch (ex: Exception) {
            log.warn("Cannot parse savings event"); return
        }
        if (node.isTextual) {
            node = try {
                objectMapper.readTree(node.asText())
            } catch (ex: Exception) {
                log.warn("Cannot parse unwrapped savings event"); return
            }
        }

        if (node.get("eventType")?.asText() != "savings.interest.accrued") return

        val goalId = node.get("goalId")?.asText()
            ?.let { runCatching { UUID.fromString(it) }.getOrNull() } ?: return
        val newSaved = node.get("newSaved")?.asLong() ?: return

        val goal = savingsGoalRepository.findById(goalId).orElse(null) ?: return
        goal.currentAmount = newSaved
        if (goal.currentAmount >= goal.targetAmount) goal.status = GoalStatus.COMPLETED
        goal.updatedAt = Instant.now()
        savingsGoalRepository.save(goal)
        log.info("Interest applied to goal {}: now {}", goalId, newSaved)
    }
}
