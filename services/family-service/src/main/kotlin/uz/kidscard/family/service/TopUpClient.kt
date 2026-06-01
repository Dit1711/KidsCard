package uz.kidscard.family.service

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import uz.kidscard.common.exception.BusinessException
import java.util.UUID

/** Tops up a child's card via payment-service (used when a parent approves a TOPUP request). */
@Service
class TopUpClient(
    @Value("\${app.payment-service.url:http://localhost:8084}") private val paymentUrl: String,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val restTemplate = RestTemplate()

    fun topUp(cardId: UUID, childId: UUID, familyId: UUID, amountUzs: Long, requestId: UUID, token: String) {
        val headers = HttpHeaders().apply {
            set("Authorization", "Bearer $token")
            set("Content-Type", "application/json")
        }
        val body = mapOf(
            "cardId" to cardId.toString(),
            "childId" to childId.toString(),
            "familyId" to familyId.toString(),
            "amountUzs" to amountUzs,
            "description" to "Пополнение по запросу ребёнка",
            "idempotencyKey" to "request-topup-$requestId",
        )
        try {
            restTemplate.postForEntity(
                "$paymentUrl/api/v1/transactions/top-up",
                HttpEntity(body, headers),
                String::class.java,
            )
        } catch (ex: Exception) {
            log.error("Top-up on request approval failed: card={} amount={} error={}", cardId, amountUzs, ex.message)
            throw BusinessException(
                "TOPUP_FAILED",
                "Не удалось пополнить карту. Попробуйте позже.",
                HttpStatus.SERVICE_UNAVAILABLE,
            )
        }
    }
}
