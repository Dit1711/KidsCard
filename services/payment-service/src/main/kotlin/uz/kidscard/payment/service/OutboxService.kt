package uz.kidscard.payment.service

import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.common.outbox.OutboxEvent
import uz.kidscard.common.outbox.OutboxStatus
import uz.kidscard.payment.repository.OutboxEventRepository
import java.time.Instant
import java.util.concurrent.TimeUnit

@Service
class OutboxService(
    private val outboxEventRepository: OutboxEventRepository,
    private val kafkaTemplate: KafkaTemplate<String, String>,
    private val objectMapper: ObjectMapper,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Transactional
    fun publish(
        aggregateType: String,
        aggregateId: String,
        eventType: String,
        topic: String,
        payload: Any,
    ) = doPublish(aggregateType, aggregateId, eventType, topic, payload)

    /**
     * Publish in an independent transaction that commits even if the caller's
     * transaction rolls back. Used to record events about REJECTED operations
     * (e.g. a purchase blocked by a limit) — the purchase tx rolls back, but the
     * "limit exceeded" notification event must still survive.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun publishInNewTransaction(
        aggregateType: String,
        aggregateId: String,
        eventType: String,
        topic: String,
        payload: Any,
    ) = doPublish(aggregateType, aggregateId, eventType, topic, payload)

    private fun doPublish(
        aggregateType: String,
        aggregateId: String,
        eventType: String,
        topic: String,
        payload: Any,
    ) {
        val json = objectMapper.writeValueAsString(payload)
        outboxEventRepository.save(
            OutboxEvent(
                aggregateType = aggregateType,
                aggregateId = aggregateId,
                eventType = eventType,
                topic = topic,
                payload = json,
            ),
        )
        log.debug("Outbox event saved: type={} aggregateId={}", eventType, aggregateId)
    }

    @Scheduled(fixedDelay = 5000)
    @Transactional
    fun processPending() {
        val events = outboxEventRepository.findTop50ByStatusOrderByCreatedAt(OutboxStatus.PENDING)
        if (events.isEmpty()) return

        events.forEach { event ->
            try {
                kafkaTemplate.send(event.topic, event.aggregateId, event.payload).get(5, TimeUnit.SECONDS)
                event.status = OutboxStatus.DELIVERED
                event.processedAt = Instant.now()
                log.debug("Outbox event delivered: id={} topic={}", event.id, event.topic)
            } catch (ex: Exception) {
                event.retryCount++
                event.lastError = ex.message?.take(500)
                if (event.retryCount >= 3) {
                    event.status = OutboxStatus.FAILED
                    log.error("Outbox event failed after {} retries: id={}", event.retryCount, event.id, ex)
                } else {
                    log.warn("Outbox delivery failed (attempt {}): id={}", event.retryCount, event.id)
                }
            }
            outboxEventRepository.save(event)
        }
    }
}
