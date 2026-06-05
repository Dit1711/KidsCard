package uz.kidscard.family.api

import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.common.api.ApiResponse
import uz.kidscard.family.service.StudySessionService
import java.util.UUID

/**
 * Child cabinet: record that the child had an AI-tutor study session today.
 * Called by ai-service forwarding the child's own token, so childId comes from
 * the JWT (cannot be spoofed). Idempotent — at most one study day is counted.
 */
@RestController
@RequestMapping("/api/v1/child/study-sessions")
class ChildStudyController(
    private val studySessionService: StudySessionService,
) {
    @PostMapping
    fun record(@AuthenticationPrincipal jwt: Jwt): ResponseEntity<ApiResponse<Unit>> {
        val childId = UUID.fromString(jwt.getClaimAsString("childId"))
        studySessionService.recordToday(childId)
        return ResponseEntity.ok(ApiResponse.ok(Unit))
    }
}
