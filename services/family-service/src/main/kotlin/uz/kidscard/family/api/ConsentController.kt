package uz.kidscard.family.api

import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.common.api.ApiResponse
import uz.kidscard.family.domain.ConsentType
import uz.kidscard.family.service.ConsentService
import uz.kidscard.family.service.ConsentStatus
import java.util.UUID

data class AcceptConsentRequest(val types: List<ConsentType> = emptyList())

data class ConsentStatusDto(
    val version: String,
    val required: List<String>,
    val granted: List<String>,
    val allGranted: Boolean,
)

private fun ConsentStatus.toDto() =
    ConsentStatusDto(version, required.map { it.name }, granted.map { it.name }, allGranted)

/** Parent legal consents (KYC-04): view what's required/granted and accept. */
@RestController
@RequestMapping("/api/v1/consents")
class ConsentController(
    private val consentService: ConsentService,
) {
    @GetMapping
    fun status(@AuthenticationPrincipal jwt: Jwt): ResponseEntity<ApiResponse<ConsentStatusDto>> {
        val userId = UUID.fromString(jwt.subject)
        return ResponseEntity.ok(ApiResponse.ok(consentService.status(userId).toDto()))
    }

    @PostMapping
    fun accept(
        @RequestBody request: AcceptConsentRequest,
        @AuthenticationPrincipal jwt: Jwt,
        httpRequest: HttpServletRequest,
    ): ResponseEntity<ApiResponse<ConsentStatusDto>> {
        val userId = UUID.fromString(jwt.subject)
        val ip = httpRequest.getHeader("X-Forwarded-For")?.split(",")?.firstOrNull()?.trim()
            ?: httpRequest.remoteAddr
        val ua = httpRequest.getHeader("User-Agent")
        return ResponseEntity.ok(ApiResponse.ok(consentService.record(userId, request.types, ip, ua).toDto()))
    }
}
