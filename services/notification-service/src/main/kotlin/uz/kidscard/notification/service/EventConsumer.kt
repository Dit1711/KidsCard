package uz.kidscard.notification.service

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.stereotype.Service
import uz.kidscard.notification.domain.NotificationCategory
import java.text.NumberFormat
import java.util.Locale
import java.util.UUID

/**
 * Turns domain events from other services into per-family in-app notifications.
 * Outbox producers (JsonSerializer over an already-serialized String) deliver a
 * double-encoded JSON string, so each payload is unwrapped if it arrives textual.
 */
@Service
class EventConsumer(
    private val notificationService: NotificationService,
    private val objectMapper: ObjectMapper,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val sum = NumberFormat.getNumberInstance(Locale("ru"))

    @KafkaListener(topics = ["payment.events"], groupId = "notification-service")
    fun onPaymentEvent(payload: String) {
        val node = parse(payload) ?: return
        val familyId = node.uuid("familyId") ?: return

        when (node.get("eventType")?.asText()) {
            "payment.transaction.completed" -> {
                val amount = node.get("amountUzs")?.asLong() ?: return
                val direction = node.get("direction")?.asText()
                val description = node.get("description")?.asText() ?: ""
                val merchant = node.get("merchantName")?.takeIf { !it.isNull }?.asText()
                val balanceAfter = node.get("balanceAfter")?.asLong()

                val (title, message, icon) = when {
                    direction == "CREDIT" && description.contains("Карманные", ignoreCase = true) ->
                        Triple("Карманные деньги", "Начислено ${money(amount)}. Баланс: ${money(balanceAfter)}", "💸")
                    direction == "CREDIT" ->
                        Triple("Пополнение карты", "Зачислено ${money(amount)}. Баланс: ${money(balanceAfter)}", "💰")
                    else ->
                        Triple("Покупка", "${merchant ?: "Списание"} — ${money(amount)}. Баланс: ${money(balanceAfter)}", "🛒")
                }
                notificationService.create(familyId, NotificationCategory.PAYMENT, title, message, icon)
            }

            "payment.limit.exceeded" -> {
                val amount = node.get("amountUzs")?.asLong()
                val merchant = node.get("merchantName")?.takeIf { !it.isNull }?.asText()
                val isCategory = node.get("limitCode")?.asText() == "CATEGORY_LIMIT_EXCEEDED"
                notificationService.create(
                    familyId, NotificationCategory.LIMIT,
                    "Лимит достигнут",
                    "Покупка ${merchant ?: ""} на ${money(amount)} отклонена: превышен ${if (isCategory) "лимит по категории" else "лимит трат"}",
                    "🚫",
                )
            }
        }
    }

    @KafkaListener(topics = ["family.events"], groupId = "notification-service")
    fun onFamilyEvent(payload: String) {
        val node = parse(payload) ?: return
        val familyId = node.uuid("familyId") ?: return

        when (node.get("eventType")?.asText()) {
            "family.limit.updated" -> {
                val amount = node.get("amountUzs")?.asLong()
                val type = node.get("limitType")?.asText()
                notificationService.create(
                    familyId, NotificationCategory.LIMIT,
                    "Лимит обновлён",
                    "Установлен ${limitLabel(type)} лимит ${money(amount)}",
                    "🛡️",
                )
            }
            "family.kyc.approved" -> {
                val name = node.get("fullName")?.takeIf { !it.isNull }?.asText()
                notificationService.create(
                    familyId, NotificationCategory.KYC,
                    "Личность подтверждена",
                    "Верификация ${name ?: "родителя"} успешно пройдена",
                    "✅",
                )
            }
            "family.co_parent.added" -> {
                notificationService.create(
                    familyId, NotificationCategory.FAMILY,
                    "Добавлен со-родитель",
                    "К семье присоединился новый родитель",
                    "👪",
                )
            }
            "family.location.fulfilled" -> {
                val childName = node.get("childName")?.takeIf { !it.isNull }?.asText() ?: "Ребёнок"
                notificationService.create(
                    familyId, NotificationCategory.FAMILY,
                    "Местоположение получено",
                    "$childName открыл приложение — местоположение обновлено.",
                    "📍",
                )
            }
            "family.location.shared" -> {
                val childName = node.get("childName")?.takeIf { !it.isNull }?.asText() ?: "Ребёнок"
                notificationService.create(
                    familyId, NotificationCategory.FAMILY,
                    "Ребёнок поделился местоположением",
                    "$childName отправил своё местоположение. Посмотрите на карте.",
                    "📍",
                )
            }
            "family.chore.submitted" -> {
                val title = node.get("title")?.takeIf { !it.isNull }?.asText() ?: "задание"
                val reward = node.get("rewardAmount")?.asLong()
                notificationService.create(
                    familyId, NotificationCategory.CHORE,
                    "Задание выполнено",
                    "Ребёнок выполнил «$title» (награда ${money(reward)}). Проверьте и подтвердите.",
                    "🎯",
                )
            }
            "family.chore.completed" -> {
                val title = node.get("title")?.takeIf { !it.isNull }?.asText() ?: "задание"
                val reward = node.get("rewardAmount")?.asLong()
                notificationService.create(
                    familyId, NotificationCategory.CHORE,
                    "Награда выдана",
                    "Задание «$title» подтверждено, ребёнку начислено ${money(reward)}.",
                    "🏆",
                )
            }
            "family.money_request.created" -> {
                val childName = node.get("childName")?.takeIf { !it.isNull }?.asText() ?: "Ребёнок"
                val amount = node.get("amountUzs")?.asLong()
                val isTopup = node.get("type")?.asText() == "TOPUP"
                val note = node.get("note")?.takeIf { !it.isNull }?.asText()?.takeIf { it.isNotBlank() }
                val what = if (isTopup) "пополнить карту на ${money(amount)}" else "поднять лимит до ${money(amount)}"
                val message = buildString {
                    append("$childName просит $what")
                    if (note != null) append(". «$note»")
                }
                notificationService.create(
                    familyId, NotificationCategory.REQUEST,
                    "Запрос от ребёнка",
                    message,
                    "🙋",
                )
            }
        }
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun parse(payload: String): JsonNode? {
        var node = try {
            objectMapper.readTree(payload)
        } catch (ex: Exception) {
            log.warn("Cannot parse event: {}", payload.take(100)); return null
        }
        if (node.isTextual) {
            node = try {
                objectMapper.readTree(node.asText())
            } catch (ex: Exception) {
                log.warn("Cannot parse unwrapped event"); return null
            }
        }
        return node
    }

    private fun JsonNode.uuid(field: String): UUID? =
        get(field)?.takeIf { !it.isNull }?.asText()?.let { runCatching { UUID.fromString(it) }.getOrNull() }

    private fun money(v: Long?): String = if (v == null) "—" else "${sum.format(v)} сум"

    private fun limitLabel(type: String?): String = when (type) {
        "DAILY" -> "дневной"
        "WEEKLY" -> "недельный"
        "MONTHLY" -> "месячный"
        "CATEGORY" -> "категорийный"
        else -> ""
    }
}
