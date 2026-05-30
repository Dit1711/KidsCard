package uz.kidscard.payment.service

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import uz.kidscard.common.exception.BusinessException
import uz.kidscard.payment.repository.LedgerEntryRepository
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

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

@Service
class LimitCheckService(
    private val ledgerEntryRepository: LedgerEntryRepository,
    @Value("\${app.family-service.url:http://localhost:8082}") private val familyServiceUrl: String,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val restTemplate = RestTemplate()

    /**
     * Fetch active limits for a child from family-service (no auth needed — internal call).
     * Silently returns empty list on failure so we don't block payments on service unavailability.
     */
    fun getLimitsForChild(familyId: UUID, childId: UUID, token: String): List<LimitRuleDto> {
        return try {
            val url = "$familyServiceUrl/api/v1/families/$familyId/children/$childId/limits"
            val headers = HttpHeaders().apply { set("Authorization", "Bearer $token") }
            val response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                HttpEntity<Void>(headers),
                FamilyApiResponse::class.java,
            )
            @Suppress("UNCHECKED_CAST")
            val raw = (response.body?.data as? List<*>) ?: return emptyList()
            // Re-map via Jackson (RestTemplate returns LinkedHashMap for generic types)
            raw.filterIsInstance<Map<*, *>>().map { m ->
                LimitRuleDto(
                    id = m["id"].toString(),
                    childId = m["childId"].toString(),
                    limitType = m["limitType"].toString(),
                    category = m["category"]?.toString(),
                    amountUzs = (m["amountUzs"] as? Number)?.toLong() ?: 0L,
                    active = m["active"] as? Boolean ?: true,
                )
            }
        } catch (ex: Exception) {
            log.warn("Could not fetch limits for childId={}: {} — skipping limit check", childId, ex.message)
            emptyList()
        }
    }

    /**
     * Checks spending limits against current ledger. Throws BusinessException if exceeded.
     */
    fun checkLimits(
        cardId: UUID,
        childId: UUID,
        familyId: UUID,
        amountUzs: Long,
        merchantMcc: String?,
        token: String,
    ) {
        val limits = getLimitsForChild(familyId, childId, token)
        if (limits.isEmpty()) return

        val now = Instant.now()

        limits.forEach { limit ->
            val periodStart: Instant = when (limit.limitType) {
                "DAILY"   -> now.truncatedTo(ChronoUnit.DAYS)
                "WEEKLY"  -> now.minus(now.dayOfWeek(), ChronoUnit.DAYS).truncatedTo(ChronoUnit.DAYS)
                "MONTHLY" -> now.truncatedTo(ChronoUnit.DAYS).let {
                    val day = java.time.ZonedDateTime.ofInstant(it, java.time.ZoneOffset.UTC).dayOfMonth
                    it.minus((day - 1).toLong(), ChronoUnit.DAYS)
                }
                "CATEGORY" -> now.truncatedTo(ChronoUnit.DAYS) // daily window for category limits
                else -> return@forEach
            }

            // For CATEGORY limits, only apply if MCC matches (or category matches description)
            if (limit.limitType == "CATEGORY") {
                if (limit.category != null && merchantMcc != null && !merchantMcc.startsWith(limit.category.take(2))) {
                    return@forEach // Category doesn't match, skip
                }
            }

            val spent = ledgerEntryRepository.computeSpentSince(cardId.toString(), periodStart)
            val projectedSpend = spent + amountUzs

            if (projectedSpend > limit.amountUzs) {
                val available = (limit.amountUzs - spent).coerceAtLeast(0)
                log.warn(
                    "Limit exceeded: cardId={} type={} limit={} spent={} requested={}",
                    cardId, limit.limitType, limit.amountUzs, spent, amountUzs,
                )
                throw BusinessException(
                    "LIMIT_EXCEEDED",
                    "Превышен лимит ${limit.limitType}: доступно $available UZS, запрошено $amountUzs UZS",
                    HttpStatus.UNPROCESSABLE_ENTITY,
                )
            }
        }
    }

    private fun Instant.dayOfWeek(): Long {
        val zdt = java.time.ZonedDateTime.ofInstant(this, java.time.ZoneOffset.UTC)
        return (zdt.dayOfWeek.value - 1).toLong()
    }
}
