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
import org.springframework.web.client.RestTemplate
import uz.kidscard.common.exception.BusinessException
import java.util.UUID

/**
 * Moves money between a child's card and a goal's savings pot in payment-service.
 *
 * The public entry points carry the Resilience4j retry + circuit breaker; the
 * private [call] helper issues the raw HTTP request and lets exceptions propagate
 * so the aspect (not a local try/catch) decides retry / breaker / fallback. 422
 * is a business rejection — surfaced as-is, never retried, never trips the breaker.
 */
@Service
class SavingsClient(
    @Value("\${app.payment-service.url:http://localhost:8084}") private val paymentUrl: String,
    private val restTemplate: RestTemplate,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Retry(name = "payment", fallbackMethod = "depositFallback")
    @CircuitBreaker(name = "payment")
    fun deposit(cardId: UUID, childId: UUID, familyId: UUID, goalId: UUID, amountUzs: Long, token: String) =
        call("deposit", cardId, childId, familyId, goalId, amountUzs, token)

    @Suppress("UNUSED_PARAMETER")
    private fun depositFallback(cardId: UUID, childId: UUID, familyId: UUID, goalId: UUID, amountUzs: Long, token: String, ex: HttpClientErrorException.UnprocessableEntity) {
        throw BusinessException("SAVINGS_REJECTED", "На карте недостаточно денег", HttpStatus.UNPROCESSABLE_ENTITY)
    }

    @Suppress("UNUSED_PARAMETER")
    private fun depositFallback(cardId: UUID, childId: UUID, familyId: UUID, goalId: UUID, amountUzs: Long, token: String, ex: Throwable) {
        log.error("Savings deposit failed: goal={} error={}", goalId, ex.message)
        throw BusinessException("SAVINGS_UNAVAILABLE", "Операция недоступна, попробуйте позже", HttpStatus.SERVICE_UNAVAILABLE)
    }

    @Retry(name = "payment", fallbackMethod = "withdrawFallback")
    @CircuitBreaker(name = "payment")
    fun withdraw(cardId: UUID, childId: UUID, familyId: UUID, goalId: UUID, amountUzs: Long, token: String) =
        call("withdraw", cardId, childId, familyId, goalId, amountUzs, token)

    @Suppress("UNUSED_PARAMETER")
    private fun withdrawFallback(cardId: UUID, childId: UUID, familyId: UUID, goalId: UUID, amountUzs: Long, token: String, ex: HttpClientErrorException.UnprocessableEntity) {
        throw BusinessException("SAVINGS_REJECTED", "В копилке меньше денег", HttpStatus.UNPROCESSABLE_ENTITY)
    }

    @Suppress("UNUSED_PARAMETER")
    private fun withdrawFallback(cardId: UUID, childId: UUID, familyId: UUID, goalId: UUID, amountUzs: Long, token: String, ex: Throwable) {
        log.error("Savings withdraw failed: goal={} error={}", goalId, ex.message)
        throw BusinessException("SAVINGS_UNAVAILABLE", "Операция недоступна, попробуйте позже", HttpStatus.SERVICE_UNAVAILABLE)
    }

    /** Parent gift from the family wallet into a child's goal. */
    @Retry(name = "payment", fallbackMethod = "contributeFallback")
    @CircuitBreaker(name = "payment")
    fun contribute(familyId: UUID, childId: UUID, goalId: UUID, amountUzs: Long, token: String) {
        val headers = HttpHeaders().apply {
            set("Authorization", "Bearer $token")
            set("Content-Type", "application/json")
        }
        val body = mapOf(
            "familyId" to familyId.toString(), "childId" to childId.toString(),
            "goalId" to goalId.toString(), "amountUzs" to amountUzs,
        )
        restTemplate.postForEntity("$paymentUrl/api/v1/savings/contribute", HttpEntity(body, headers), String::class.java)
    }

    @Suppress("UNUSED_PARAMETER")
    private fun contributeFallback(familyId: UUID, childId: UUID, goalId: UUID, amountUzs: Long, token: String, ex: HttpClientErrorException.UnprocessableEntity) {
        throw BusinessException("INSUFFICIENT_WALLET_FUNDS", "В кошельке недостаточно средств", HttpStatus.UNPROCESSABLE_ENTITY)
    }

    @Suppress("UNUSED_PARAMETER")
    private fun contributeFallback(familyId: UUID, childId: UUID, goalId: UUID, amountUzs: Long, token: String, ex: Throwable) {
        log.error("Gift failed: goal={} error={}", goalId, ex.message)
        throw BusinessException("SAVINGS_UNAVAILABLE", "Операция недоступна, попробуйте позже", HttpStatus.SERVICE_UNAVAILABLE)
    }

    /** Issues the raw HTTP call; exceptions propagate to the caller's resilience aspect. */
    private fun call(
        op: String, cardId: UUID, childId: UUID, familyId: UUID, goalId: UUID, amountUzs: Long, token: String,
    ) {
        val headers = HttpHeaders().apply {
            set("Authorization", "Bearer $token")
            set("Content-Type", "application/json")
        }
        val body = mapOf(
            "cardId" to cardId.toString(), "childId" to childId.toString(),
            "familyId" to familyId.toString(), "goalId" to goalId.toString(), "amountUzs" to amountUzs,
        )
        restTemplate.postForEntity("$paymentUrl/api/v1/savings/$op", HttpEntity(body, headers), String::class.java)
    }
}
