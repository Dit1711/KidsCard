package uz.kidscard.kyc.api

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.common.api.ApiResponse
import uz.kidscard.kyc.api.dto.LivenessRequest
import uz.kidscard.kyc.api.dto.SessionDto
import uz.kidscard.kyc.api.dto.StartSessionRequest
import uz.kidscard.kyc.api.dto.UploadDocumentRequest
import uz.kidscard.kyc.service.KycService
import java.util.UUID

@RestController
@RequestMapping("/api/v1/kyc")
class KycController(
    private val kycService: KycService,
) {

    /** Текущий статус верификации пользователя (или null, если не начата) */
    @GetMapping("/status")
    fun status(@AuthenticationPrincipal jwt: Jwt): ResponseEntity<ApiResponse<SessionDto?>> {
        val userId = UUID.fromString(jwt.subject)
        return ResponseEntity.ok(ApiResponse.ok(kycService.getStatus(userId)))
    }

    /** Начать (или продолжить) сессию верификации */
    @PostMapping("/sessions")
    fun start(
        @Valid @RequestBody req: StartSessionRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<SessionDto>> {
        val userId = UUID.fromString(jwt.subject)
        val result = kycService.startSession(userId, req.type)
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(result))
    }

    /** Загрузить документ, удостоверяющий личность */
    @PostMapping("/sessions/{sessionId}/documents")
    fun uploadDocument(
        @PathVariable sessionId: UUID,
        @Valid @RequestBody req: UploadDocumentRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<SessionDto>> {
        val userId = UUID.fromString(jwt.subject)
        val result = kycService.uploadDocument(sessionId, userId, req.docType, req.frontUrl, req.backUrl)
        return ResponseEntity.ok(ApiResponse.ok(result))
    }

    /** Пройти liveness-проверку (селфи). Mock-провайдер авто-одобряет. */
    @PostMapping("/sessions/{sessionId}/liveness")
    fun liveness(
        @PathVariable sessionId: UUID,
        @Valid @RequestBody req: LivenessRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<SessionDto>> {
        val userId = UUID.fromString(jwt.subject)
        val result = kycService.submitLiveness(sessionId, userId, req.videoUrl)
        return ResponseEntity.ok(ApiResponse.ok(result))
    }
}
