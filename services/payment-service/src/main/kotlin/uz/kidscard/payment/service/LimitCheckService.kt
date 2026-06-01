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

data class LimitUsageDto(
    val limitType: String,
    val category: String?,
    val limitUzs: Long,
    val spentUzs: Long,
    val remainingUzs: Long,
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

    /** Fetch the child's own active limits via the child-scoped endpoint. */
    fun getLimitsForChildSelf(token: String): List<LimitRuleDto> {
        return try {
            val url = "$familyServiceUrl/api/v1/child/limits"
            val headers = HttpHeaders().apply { set("Authorization", "Bearer $token") }
            val response = restTemplate.exchange(url, HttpMethod.GET, HttpEntity<Void>(headers), FamilyApiResponse::class.java)
            @Suppress("UNCHECKED_CAST")
            val raw = (response.body?.data as? List<*>) ?: return emptyList()
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
            log.warn("Could not fetch child's own limits: {} — skipping limit check", ex.message)
            emptyList()
        }
    }

    /** Parent-initiated purchase: limits fetched via the family path. */
    fun checkLimits(cardId: UUID, childId: UUID, familyId: UUID, amountUzs: Long, merchantMcc: String?, token: String) =
        evaluate(cardId, amountUzs, merchantMcc, getLimitsForChild(familyId, childId, token))

    /** Child-initiated purchase: limits fetched via the child path. */
    fun checkLimitsChild(cardId: UUID, amountUzs: Long, merchantMcc: String?, token: String) =
        evaluate(cardId, amountUzs, merchantMcc, getLimitsForChildSelf(token))

    /** Child cabinet: each of the child's limits with how much is spent/left. */
    fun usageForChild(cardId: UUID, token: String): List<LimitUsageDto> {
        val now = Instant.now()
        val monthStart = now.truncatedTo(ChronoUnit.DAYS).let {
            val day = java.time.ZonedDateTime.ofInstant(it, java.time.ZoneOffset.UTC).dayOfMonth
            it.minus((day - 1).toLong(), ChronoUnit.DAYS)
        }
        return getLimitsForChildSelf(token).mapNotNull { limit ->
            val spent = when (limit.limitType) {
                "DAILY"   -> ledgerEntryRepository.computeSpentSince(cardId.toString(), now.truncatedTo(ChronoUnit.DAYS))
                "WEEKLY"  -> ledgerEntryRepository.computeSpentSince(cardId.toString(), now.minus(now.dayOfWeek(), ChronoUnit.DAYS).truncatedTo(ChronoUnit.DAYS))
                "MONTHLY" -> ledgerEntryRepository.computeSpentSince(cardId.toString(), monthStart)
                "CATEGORY" -> limit.category?.let { ledgerEntryRepository.computeCategorySpentSince(cardId.toString(), it, monthStart) } ?: return@mapNotNull null
                else -> return@mapNotNull null
            }
            LimitUsageDto(
                limitType = limit.limitType,
                category = limit.category,
                limitUzs = limit.amountUzs,
                spentUzs = spent.coerceAtMost(limit.amountUzs),
                remainingUzs = (limit.amountUzs - spent).coerceAtLeast(0),
            )
        }
    }

    /**
     * Checks spending limits against current ledger. Throws BusinessException if exceeded.
     */
    private fun evaluate(cardId: UUID, amountUzs: Long, merchantMcc: String?, limits: List<LimitRuleDto>) {
        if (limits.isEmpty()) return

        val now = Instant.now()

        val monthStart = now.truncatedTo(ChronoUnit.DAYS).let {
            val day = java.time.ZonedDateTime.ofInstant(it, java.time.ZoneOffset.UTC).dayOfMonth
            it.minus((day - 1).toLong(), ChronoUnit.DAYS)
        }

        limits.forEach { limit ->
            // CATEGORY: monthly budget on one merchant category (exact MCC match).
            // Only counts this purchase if its MCC matches, and sums only that
            // category's spend for the month — not total spending.
            if (limit.limitType == "CATEGORY") {
                if (limit.category == null || merchantMcc == null || merchantMcc != limit.category) return@forEach
                val spent = ledgerEntryRepository.computeCategorySpentSince(cardId.toString(), merchantMcc, monthStart)
                if (spent + amountUzs > limit.amountUzs) {
                    val available = (limit.amountUzs - spent).coerceAtLeast(0)
                    log.warn("Category limit exceeded: card={} mcc={} limit={} spent={} requested={}", cardId, merchantMcc, limit.amountUzs, spent, amountUzs)
                    throw BusinessException(
                        "CATEGORY_LIMIT_EXCEEDED",
                        "Превышен лимит по категории: доступно $available UZS, запрошено $amountUzs UZS",
                        HttpStatus.UNPROCESSABLE_ENTITY,
                    )
                }
                return@forEach
            }

            val periodStart: Instant = when (limit.limitType) {
                "DAILY"   -> now.truncatedTo(ChronoUnit.DAYS)
                "WEEKLY"  -> now.minus(now.dayOfWeek(), ChronoUnit.DAYS).truncatedTo(ChronoUnit.DAYS)
                "MONTHLY" -> monthStart
                else -> return@forEach
            }

            val spent = ledgerEntryRepository.computeSpentSince(cardId.toString(), periodStart)
            if (spent + amountUzs > limit.amountUzs) {
                val available = (limit.amountUzs - spent).coerceAtLeast(0)
                log.warn("Limit exceeded: cardId={} type={} limit={} spent={} requested={}", cardId, limit.limitType, limit.amountUzs, spent, amountUzs)
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
