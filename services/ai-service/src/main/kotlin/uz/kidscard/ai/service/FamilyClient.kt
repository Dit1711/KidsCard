package uz.kidscard.ai.service

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.stereotype.Service
import org.springframework.web.client.RestClientResponseException
import org.springframework.web.client.RestTemplate
import java.util.UUID

/**
 * Verifies that the calling parent actually belongs to the family that owns a
 * child, by delegating to family-service (the source of truth for the family
 * graph). The parent's own JWT is forwarded, so family-service applies the same
 * membership check it uses everywhere else — ai-service stores no family graph.
 *
 * Fail-CLOSED: any error (4xx, outage, timeout) → not authorized. AI history is
 * private, so when in doubt we deny rather than risk leaking a child's chats.
 */
@Service
class FamilyClient(
    @Value("\${app.family-service.url:http://localhost:8082}") private val familyServiceUrl: String,
    private val restTemplate: RestTemplate,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    /** True only if family-service confirms this parent may see this child. */
    fun parentOwnsChild(familyId: UUID, childId: UUID, token: String): Boolean {
        val url = "$familyServiceUrl/api/v1/families/$familyId/children/$childId"
        return try {
            val headers = HttpHeaders().apply { set("Authorization", "Bearer $token") }
            val response = restTemplate.exchange(url, HttpMethod.GET, HttpEntity<Void>(headers), String::class.java)
            response.statusCode.is2xxSuccessful
        } catch (ex: RestClientResponseException) {
            log.debug("Ownership denied family={} child={}: {}", familyId, childId, ex.statusCode)
            false
        } catch (ex: Exception) {
            log.warn("Ownership check failed family={} child={}: {} — denying", familyId, childId, ex.message)
            false
        }
    }
}
