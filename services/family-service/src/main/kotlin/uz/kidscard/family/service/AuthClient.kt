package uz.kidscard.family.service

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.stereotype.Service
import org.springframework.web.client.HttpClientErrorException
import uz.kidscard.common.http.internalRestTemplate
import java.util.UUID

@JsonIgnoreProperties(ignoreUnknown = true)
private data class UserLookupBody(val success: Boolean, val data: Map<String, String>? = null)

/** Looks up registered users in auth-service (e.g. to invite a co-parent by phone). */
@Service
class AuthClient(
    @Value("\${app.auth-service.url:http://localhost:8081}") private val authUrl: String,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val restTemplate = internalRestTemplate()

    /** Returns the userId for a phone, or null if no such registered user. */
    fun findUserIdByPhone(phone: String, token: String): UUID? {
        return try {
            val headers = HttpHeaders().apply { set("Authorization", "Bearer $token") }
            // Encode the phone and pass a ready URI: a raw "+" in a query string is
            // decoded server-side as a space, which would break the phone match.
            val encoded = java.net.URLEncoder.encode(phone, Charsets.UTF_8)
            val uri = java.net.URI("$authUrl/api/v1/auth/users/by-phone?phone=$encoded")
            val response = restTemplate.exchange(
                uri, HttpMethod.GET, HttpEntity<Void>(headers), UserLookupBody::class.java,
            )
            response.body?.data?.get("userId")?.let { UUID.fromString(it) }
        } catch (ex: HttpClientErrorException.NotFound) {
            null
        } catch (ex: Exception) {
            log.warn("Auth lookup failed for phone: {}", ex.message)
            null
        }
    }
}
