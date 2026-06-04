package uz.kidscard.compliance.api

import org.springframework.data.domain.PageRequest
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.common.api.ApiResponse
import uz.kidscard.common.exception.BusinessException
import uz.kidscard.compliance.api.dto.AmlAlertDto
import uz.kidscard.compliance.api.dto.AuditLogDto
import uz.kidscard.compliance.api.dto.UpdateAlertStatusRequest
import uz.kidscard.compliance.api.dto.toDto
import uz.kidscard.compliance.domain.AmlAlertStatus
import uz.kidscard.compliance.repository.AmlAlertRepository
import uz.kidscard.compliance.repository.AuditLogRepository
import java.time.Instant
import java.util.UUID

/**
 * Read/triage API for the compliance team. Access is restricted to COMPLIANCE /
 * ADMIN roles in SecurityConfig — both the audit trail and AML alerts are
 * sensitive (money & PII).
 */
@RestController
@RequestMapping("/api/v1/compliance")
class ComplianceController(
    private val auditLogRepository: AuditLogRepository,
    private val amlAlertRepository: AmlAlertRepository,
) {

    // ── Audit trail ────────────────────────────────────────────────────────────

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

    // ── AML alerts ──────────────────────────────────────────────────────────────

    @GetMapping("/alerts")
    fun alerts(
        @RequestParam(required = false) status: String?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "50") size: Int,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<List<AmlAlertDto>>> {
        val pageable = PageRequest.of(page, size.coerceIn(1, 200))
        val result = if (status != null) {
            amlAlertRepository.findByStatusOrderByCreatedAtDesc(status.uppercase(), pageable)
        } else {
            amlAlertRepository.findAllByOrderByCreatedAtDesc(pageable)
        }
        return ResponseEntity.ok(ApiResponse.ok(result.content.map { it.toDto() }))
    }

    @PatchMapping("/alerts/{id}/status")
    fun updateAlertStatus(
        @PathVariable id: UUID,
        @RequestBody req: UpdateAlertStatusRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<AmlAlertDto>> {
        val newStatus = runCatching { AmlAlertStatus.valueOf(req.status.uppercase()) }.getOrNull()
            ?: throw BusinessException(
                "INVALID_STATUS",
                "Недопустимый статус. Разрешено: ${AmlAlertStatus.entries.joinToString { it.name }}",
                HttpStatus.BAD_REQUEST,
            )
        val alert = amlAlertRepository.findById(id).orElseThrow {
            BusinessException("ALERT_NOT_FOUND", "Алерт не найден", HttpStatus.NOT_FOUND)
        }
        alert.status = newStatus.name
        alert.resolutionNote = req.note
        alert.resolvedBy = runCatching { UUID.fromString(jwt.subject) }.getOrNull()
        alert.updatedAt = Instant.now()
        return ResponseEntity.ok(ApiResponse.ok(amlAlertRepository.save(alert).toDto()))
    }
}
