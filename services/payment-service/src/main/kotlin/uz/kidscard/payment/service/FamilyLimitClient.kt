package uz.kidscard.payment.service

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker
import io.github.resilience4j.retry.annotation.Retry
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.stereotype.Service
import java.util.UUID
import uz.kidscard.common.http.internalRestTemplate

@JsonIgnoreProperties(ignoreUnknown = true)
data class LimitRuleDto(
    val id: String,
    val childId: String,
    val limitType: String,   // DAILY, WEEKLY, MONTHLY, CATEGORY
    val category: String?,
    val amountUzs: Long,
    val active: Boolean,
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class FamilyApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
)

/**
 * Fetches a child's active spending limits from family-service.
 *
 * This is a *fail-open* dependency: on a transient outage we retry a couple of
 * times, and if family-service is clearly unhealthy the circuit breaker trips so
 * we fail fast instead of stalling every purchase. Either way the fallback
 * returns an empty list — limits are advisory and must never hard-block a
 * payment when the limits service is unavailable.
 *
 * Lives in its own bean (not inside LimitCheckService) so Spring's AOP proxy
 * applies — a self-invoked method would bypass the resilience aspects entirely.
 */
@Service
class FamilyLimitClient(
    @Value("\${app.family-service.url:http://localhost:8082}") private val familyServiceUrl: String,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val restTemplate = internalRestTemplate()

    /** Active limits for a child via the family-scoped (parent) endpoint. */
    @Retry(name = "family", fallbackMethod = "limitsFallback")
    @CircuitBreaker(name = "family")
    fun getLimitsForChild(familyId: UUID, childId: UUID, token: String): List<LimitRuleDto> {
        val url = "$familyServiceUrl/api/v1/families/$familyId/children/$childId/limits"
        return fetch(url, token)
    }

    @Suppress("UNUSED_PARAMETER")
    private fun limitsFallback(familyId: UUID, childId: UUID, token: String, ex: Throwable): List<LimitRuleDto> {
        log.warn("Could not fetch limits for childId={}: {} — skipping limit check", childId, ex.message)
        return emptyList()
    }

    /** The child's own active limits via the child-scoped endpoint. */
    @Retry(name = "family", fallbackMethod = "selfLimitsFallback")
    @CircuitBreaker(name = "family")
    fun getLimitsForChildSelf(token: String): List<LimitRuleDto> {
        val url = "$familyServiceUrl/api/v1/child/limits"
        return fetch(url, token)
    }

    @Suppress("UNUSED_PARAMETER")
    private fun selfLimitsFallback(token: String, ex: Throwable): List<LimitRuleDto> {
        log.warn("Could not fetch child's own limits: {} — skipping limit check", ex.message)
        return emptyList()
    }

    private fun fetch(url: String, token: String): List<LimitRuleDto> {
        val headers = HttpHeaders().apply { set("Authorization", "Bearer $token") }
        val response = restTemplate.exchange(
            url, HttpMethod.GET, HttpEntity<Void>(headers), FamilyApiResponse::class.java,
        )
        val raw = (response.body?.data as? List<*>) ?: return emptyList()
        // Re-map via field access (RestTemplate returns LinkedHashMap for generic types).
        return raw.filterIsInstance<Map<*, *>>().map { m ->
            LimitRuleDto(
                id = m["id"].toString(),
                childId = m["childId"].toString(),
                limitType = m["limitType"].toString(),
                category = m["category"]?.toString(),
                amountUzs = (m["amountUzs"] as? Number)?.toLong() ?: 0L,
                active = m["active"] as? Boolean ?: true,
            )
        }
    }
}
