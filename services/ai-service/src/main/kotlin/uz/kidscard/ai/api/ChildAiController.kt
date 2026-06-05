package uz.kidscard.ai.api

import jakarta.validation.Valid
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
import uz.kidscard.ai.api.dto.ChatMessageDto
import uz.kidscard.ai.api.dto.ChatReplyDto
import uz.kidscard.ai.api.dto.ChatRequest
import uz.kidscard.ai.api.dto.ThreadDto
import uz.kidscard.ai.service.AiTutorService
import java.util.UUID

/** Child cabinet: chat with the AI study buddy, organized into conversations. */
@RestController
@RequestMapping("/api/v1/child/ai")
class ChildAiController(
    private val tutorService: AiTutorService,
) {
    @PostMapping("/chat")
    fun chat(
        @Valid @RequestBody request: ChatRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<ChatReplyDto>> {
        val childId = UUID.fromString(jwt.getClaimAsString("childId"))
        val r = tutorService.chat(childId, request.threadId, request.message)
        return ResponseEntity.ok(ApiResponse.ok(ChatReplyDto(r.reply, r.limited, r.threadId, r.threadTitle)))
    }

    /** List the child's conversations (most recent first). */
    @GetMapping("/threads")
    fun threads(@AuthenticationPrincipal jwt: Jwt): ResponseEntity<ApiResponse<List<ThreadDto>>> {
        val childId = UUID.fromString(jwt.getClaimAsString("childId"))
        val threads = tutorService.listThreads(childId).map { ThreadDto(it.id, it.title, it.updatedAt) }
        return ResponseEntity.ok(ApiResponse.ok(threads))
    }

    /** Messages of one conversation. */
    @GetMapping("/threads/{threadId}/messages")
    fun threadMessages(
        @PathVariable threadId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<List<ChatMessageDto>>> {
        val childId = UUID.fromString(jwt.getClaimAsString("childId"))
        val msgs = tutorService.threadHistory(childId, threadId).map { ChatMessageDto(it.role.name, it.content, it.createdAt) }
        return ResponseEntity.ok(ApiResponse.ok(msgs))
    }
}
