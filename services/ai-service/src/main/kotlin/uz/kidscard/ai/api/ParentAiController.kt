package uz.kidscard.ai.api

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import uz.kidscard.ai.api.dto.AiSettingsDto
import uz.kidscard.ai.api.dto.ChatMessageDto
import uz.kidscard.ai.api.dto.ThreadDto
import uz.kidscard.ai.api.dto.UpdateAiSettingsRequest
import uz.kidscard.ai.service.AiSettingsService
import uz.kidscard.ai.service.AiTutorService
import uz.kidscard.ai.service.FamilyClient
import uz.kidscard.common.api.ApiResponse
import java.util.UUID

/**
 * Parent cabinet: manage a child's AI controls and read their conversations.
 *
 * Every endpoint re-checks, against family-service, that the calling parent owns
 * the child — the parent JWT carries no family graph, so ownership is verified
 * per request and ai-service never trusts the childId alone.
 */
@RestController
@RequestMapping("/api/v1/parent/ai")
class ParentAiController(
    private val tutorService: AiTutorService,
    private val settingsService: AiSettingsService,
    private val familyClient: FamilyClient,
) {
    @GetMapping("/settings")
    fun getSettings(
        @RequestParam familyId: UUID,
        @RequestParam childId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<AiSettingsDto>> {
        authorize(familyId, childId, jwt)
        val s = settingsService.effective(childId)
        return ResponseEntity.ok(ApiResponse.ok(AiSettingsDto(s.enabled, s.dailyLimit, s.dailyLimitCustom)))
    }

    @PutMapping("/settings")
    fun updateSettings(
        @RequestBody request: UpdateAiSettingsRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<AiSettingsDto>> {
        authorize(request.familyId, request.childId, jwt)
        val s = settingsService.update(request.childId, request.enabled, request.dailyLimit)
        return ResponseEntity.ok(ApiResponse.ok(AiSettingsDto(s.enabled, s.dailyLimit, s.dailyLimitCustom)))
    }

    @GetMapping("/threads")
    fun threads(
        @RequestParam familyId: UUID,
        @RequestParam childId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<List<ThreadDto>>> {
        authorize(familyId, childId, jwt)
        val threads = tutorService.listThreads(childId).map { ThreadDto(it.id, it.title, it.updatedAt) }
        return ResponseEntity.ok(ApiResponse.ok(threads))
    }

    @GetMapping("/threads/{threadId}/messages")
    fun threadMessages(
        @PathVariable threadId: UUID,
        @RequestParam familyId: UUID,
        @RequestParam childId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<List<ChatMessageDto>>> {
        authorize(familyId, childId, jwt)
        val msgs = tutorService.threadHistory(childId, threadId).map { ChatMessageDto(it.role.name, it.content, it.createdAt) }
        return ResponseEntity.ok(ApiResponse.ok(msgs))
    }

    /** 403 unless family-service confirms this parent owns the child. */
    private fun authorize(familyId: UUID, childId: UUID, jwt: Jwt) {
        if (!familyClient.parentOwnsChild(familyId, childId, jwt.tokenValue)) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Not your child")
        }
    }
}
