package uz.kidscard.family.service

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker
import io.github.resilience4j.retry.annotation.Retry
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.client.HttpClientErrorException
import uz.kidscard.common.exception.BusinessException
import uz.kidscard.common.http.internalRestTemplate
import java.util.UUID

/**
 * Talks to payment-service's wallet/escrow API. Holds are placed synchronously
 * at chore creation so the parent gets immediate "insufficient funds" feedback
 * and the reward is guaranteed at approval time.
 *
 * Calls are wrapped with Resilience4j retry (transient 5xx / connection errors)
 * and a circuit breaker (fail fast once payment-service is clearly unhealthy).
 * Business outcomes (422 = insufficient funds) are NOT retried and do NOT trip
 * the breaker — they flow straight to the fallback and become a normal error.
 */
@Service
class WalletClient(
    @Value("\${app.payment-service.url:http://localhost:8084}") private val paymentUrl: String,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val restTemplate = internalRestTemplate()

    @Retry(name = "payment", fallbackMethod = "placeHoldFallback")
    @CircuitBreaker(name = "payment")
    fun placeHold(familyId: UUID, choreId: UUID, amountUzs: Long, token: String) {
        val headers = HttpHeaders().apply {
            set("Authorization", "Bearer $token")
            set("Content-Type", "application/json")
        }
        val body = mapOf(
            "familyId" to familyId.toString(),
            "reference" to "chore:$choreId",
            "amountUzs" to amountUzs,
        )
        restTemplate.postForEntity("$paymentUrl/api/v1/wallet/hold", HttpEntity(body, headers), String::class.java)
    }

    // 422 — insufficient wallet funds: a deterministic business outcome, surfaced as-is.
    @Suppress("UNUSED_PARAMETER")
    private fun placeHoldFallback(familyId: UUID, choreId: UUID, amountUzs: Long, token: String, ex: HttpClientErrorException.UnprocessableEntity) {
        throw BusinessException(
            "INSUFFICIENT_WALLET_FUNDS",
            "Недостаточно средств в кошельке. Пополните кошелёк, чтобы назначить награду.",
            HttpStatus.UNPROCESSABLE_ENTITY,
        )
    }

    // Anything else (timeout, 5xx, breaker open) — payment-service is unavailable.
    @Suppress("UNUSED_PARAMETER")
    private fun placeHoldFallback(familyId: UUID, choreId: UUID, amountUzs: Long, token: String, ex: Throwable) {
        log.error("Wallet hold failed: family={} chore={} error={}", familyId, choreId, ex.message)
        throw BusinessException(
            "WALLET_UNAVAILABLE",
            "Не удалось зарезервировать награду. Попробуйте позже.",
            HttpStatus.SERVICE_UNAVAILABLE,
        )
    }

    @Retry(name = "payment", fallbackMethod = "releaseFallback")
    @CircuitBreaker(name = "payment")
    fun release(choreId: UUID, token: String) {
        val headers = HttpHeaders().apply { set("Authorization", "Bearer $token") }
        restTemplate.postForEntity(
            "$paymentUrl/api/v1/wallet/hold/chore:$choreId/release",
            HttpEntity<Void>(headers),
            String::class.java,
        )
    }

    // Releasing a hold is best-effort: log and move on (the hold expires anyway).
    @Suppress("UNUSED_PARAMETER")
    private fun releaseFallback(choreId: UUID, token: String, ex: Throwable) {
        log.warn("Wallet release failed for chore={}: {}", choreId, ex.message)
    }
}
