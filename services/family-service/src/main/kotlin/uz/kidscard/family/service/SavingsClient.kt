package uz.kidscard.family.service

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

/** Moves money between a child's card and a goal's savings pot in payment-service. */
@Service
class SavingsClient(
    @Value("\${app.payment-service.url:http://localhost:8084}") private val paymentUrl: String,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val restTemplate = RestTemplate()

    fun deposit(cardId: UUID, childId: UUID, familyId: UUID, goalId: UUID, amountUzs: Long, token: String) =
        call("deposit", cardId, childId, familyId, goalId, amountUzs, token)

    fun withdraw(cardId: UUID, childId: UUID, familyId: UUID, goalId: UUID, amountUzs: Long, token: String) =
        call("withdraw", cardId, childId, familyId, goalId, amountUzs, token)

    /** Parent gift from the family wallet into a child's goal. */
    fun contribute(familyId: UUID, childId: UUID, goalId: UUID, amountUzs: Long, token: String) {
        val headers = HttpHeaders().apply {
            set("Authorization", "Bearer $token")
            set("Content-Type", "application/json")
        }
        val body = mapOf(
            "familyId" to familyId.toString(), "childId" to childId.toString(),
            "goalId" to goalId.toString(), "amountUzs" to amountUzs,
        )
        try {
            restTemplate.postForEntity("$paymentUrl/api/v1/savings/contribute", HttpEntity(body, headers), String::class.java)
        } catch (ex: HttpClientErrorException.UnprocessableEntity) {
            throw BusinessException("INSUFFICIENT_WALLET_FUNDS", "В кошельке недостаточно средств", HttpStatus.UNPROCESSABLE_ENTITY)
        } catch (ex: Exception) {
            log.error("Gift failed: goal={} error={}", goalId, ex.message)
            throw BusinessException("SAVINGS_UNAVAILABLE", "Операция недоступна, попробуйте позже", HttpStatus.SERVICE_UNAVAILABLE)
        }
    }

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
        try {
            restTemplate.postForEntity("$paymentUrl/api/v1/savings/$op", HttpEntity(body, headers), String::class.java)
        } catch (ex: HttpClientErrorException.UnprocessableEntity) {
            val msg = if (op == "deposit") "На карте недостаточно денег" else "В копилке меньше денег"
            throw BusinessException("SAVINGS_REJECTED", msg, HttpStatus.UNPROCESSABLE_ENTITY)
        } catch (ex: Exception) {
            log.error("Savings {} failed: goal={} error={}", op, goalId, ex.message)
            throw BusinessException("SAVINGS_UNAVAILABLE", "Операция недоступна, попробуйте позже", HttpStatus.SERVICE_UNAVAILABLE)
        }
    }
}
