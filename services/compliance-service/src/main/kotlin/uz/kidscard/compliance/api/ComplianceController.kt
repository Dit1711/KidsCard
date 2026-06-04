package uz.kidscard.compliance.api

import org.springframework.data.domain.PageRequest
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.common.api.ApiResponse
import uz.kidscard.compliance.api.dto.AuditLogDto
import uz.kidscard.compliance.api.dto.toDto
import uz.kidscard.compliance.repository.AuditLogRepository
import java.util.UUID

/**
 * Read API for the compliance team. Access is restricted to COMPLIANCE / ADMIN
 * roles in SecurityConfig — the audit trail is sensitive (money & PII events).
 */
@RestController
@RequestMapping("/api/v1/compliance")
class ComplianceController(
    private val auditLogRepository: AuditLogRepository,
) {

    @GetMapping("/audit")
    fun audit(
        @RequestParam(required = false) familyId: UUID?,
        @RequestParam(required = false) eventType: String?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "50") size: Int,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<List<AuditLogDto>>> {
        val pageable = PageRequest.of(page, size.coerceIn(1, 200))
        val result = when {
            familyId != null -> auditLogRepository.findByFamilyIdOrderBySeqDesc(familyId, pageable)
            eventType != null -> auditLogRepository.findByEventTypeOrderBySeqDesc(eventType, pageable)
            else -> auditLogRepository.findAllByOrderBySeqDesc(pageable)
        }
        return ResponseEntity.ok(ApiResponse.ok(result.content.map { it.toDto() }))
    }
}
