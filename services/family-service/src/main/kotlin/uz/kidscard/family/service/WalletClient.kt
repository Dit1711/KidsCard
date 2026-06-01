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

/**
 * Talks to payment-service's wallet/escrow API. Holds are placed synchronously
 * at chore creation so the parent gets immediate "insufficient funds" feedback
 * and the reward is guaranteed at approval time.
 */
@Service
class WalletClient(
    @Value("\${app.payment-service.url:http://localhost:8084}") private val paymentUrl: String,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val restTemplate = RestTemplate()

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
        try {
            restTemplate.postForEntity("$paymentUrl/api/v1/wallet/hold", HttpEntity(body, headers), String::class.java)
        } catch (ex: HttpClientErrorException.UnprocessableEntity) {
            throw BusinessException(
                "INSUFFICIENT_WALLET_FUNDS",
                "Недостаточно средств в кошельке. Пополните кошелёк, чтобы назначить награду.",
                HttpStatus.UNPROCESSABLE_ENTITY,
            )
        } catch (ex: Exception) {
            log.error("Wallet hold failed: family={} chore={} error={}", familyId, choreId, ex.message)
            throw BusinessException(
                "WALLET_UNAVAILABLE",
                "Не удалось зарезервировать награду. Попробуйте позже.",
                HttpStatus.SERVICE_UNAVAILABLE,
            )
        }
    }

    fun release(choreId: UUID, token: String) {
        val headers = HttpHeaders().apply { set("Authorization", "Bearer $token") }
        try {
            restTemplate.postForEntity(
                "$paymentUrl/api/v1/wallet/hold/chore:$choreId/release",
                HttpEntity<Void>(headers),
                String::class.java,
            )
        } catch (ex: Exception) {
            log.warn("Wallet release failed for chore={}: {}", choreId, ex.message)
        }
    }
}
