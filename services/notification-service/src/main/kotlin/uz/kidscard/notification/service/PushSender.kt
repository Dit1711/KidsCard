package uz.kidscard.notification.service

import com.fasterxml.jackson.databind.ObjectMapper
import nl.martijndwars.webpush.Notification
import nl.martijndwars.webpush.PushService as WebPushService
import nl.martijndwars.webpush.Subscription
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.notification.domain.PushSubscription
import uz.kidscard.notification.repository.PushSubscriptionRepository
import java.util.UUID

/** Stores Web Push subscriptions and delivers push messages to a family's devices. */
@Service
class PushSender(
    private val webPushService: WebPushService,
    private val pushSubscriptionRepository: PushSubscriptionRepository,
    private val objectMapper: ObjectMapper,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Transactional
    fun subscribe(familyId: UUID, endpoint: String, p256dh: String, auth: String) {
        val existing = pushSubscriptionRepository.findByEndpoint(endpoint)
        if (existing != null) {
            existing.p256dh = p256dh
            existing.auth = auth
            pushSubscriptionRepository.save(existing)
        } else {
            pushSubscriptionRepository.save(
                PushSubscription(familyId = familyId, endpoint = endpoint, p256dh = p256dh, auth = auth),
            )
        }
        log.info("Push subscription saved for family={}", familyId)
    }

    /**
     * Fire-and-forget delivery to all of a family's devices. Runs async so the
     * notification write (and the Kafka consumer) isn't blocked on network IO.
     * Stale subscriptions (404/410) are pruned.
     */
    @Async
    @Transactional
    fun sendToFamily(familyId: UUID, title: String, message: String, icon: String) {
        val subs = pushSubscriptionRepository.findByFamilyId(familyId)
        if (subs.isEmpty()) return

        val payload = objectMapper.writeValueAsString(
            mapOf("title" to "$icon $title", "body" to message),
        )

        subs.forEach { sub ->
            try {
                val subscription = Subscription(sub.endpoint, Subscription.Keys(sub.p256dh, sub.auth))
                val response = webPushService.send(Notification(subscription, payload))
                val code = response.statusLine.statusCode
                when {
                    code == 404 || code == 410 -> {
                        pushSubscriptionRepository.deleteByEndpoint(sub.endpoint)
                        log.info("Pruned stale push subscription (status {})", code)
                    }
                    code !in 200..299 -> log.warn("Push send returned {} for family={}", code, familyId)
                    else -> log.debug("Push delivered to one device for family={}", familyId)
                }
            } catch (ex: Exception) {
                log.warn("Push send failed for family={}: {}", familyId, ex.message)
            }
        }
    }
}
