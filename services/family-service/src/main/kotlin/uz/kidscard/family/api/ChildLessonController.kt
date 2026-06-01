package uz.kidscard.family.api

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
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
import uz.kidscard.family.api.dto.LessonProgressDto
import uz.kidscard.family.service.LessonProgressService
import java.util.UUID

data class CompleteLessonRequest(
    @field:Min(0) @field:Max(100) val stars: Int = 0,
    val quizCorrect: Boolean = false,
)

/** Child cabinet: financial-literacy lessons progress and completion. */
@RestController
@RequestMapping("/api/v1/child/lessons")
class ChildLessonController(
    private val lessonProgressService: LessonProgressService,
) {

    @GetMapping("/progress")
    fun progress(@AuthenticationPrincipal jwt: Jwt): ResponseEntity<ApiResponse<LessonProgressDto>> {
        val childId = UUID.fromString(jwt.getClaimAsString("childId"))
        return ResponseEntity.ok(ApiResponse.ok(lessonProgressService.getProgress(childId)))
    }

    @PostMapping("/{lessonId}/complete")
    fun complete(
        @PathVariable lessonId: String,
        @RequestBody req: CompleteLessonRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<LessonProgressDto>> {
        val childId = UUID.fromString(jwt.getClaimAsString("childId"))
        val result = lessonProgressService.complete(childId, lessonId, req.stars, req.quizCorrect)
        return ResponseEntity.ok(ApiResponse.ok(result))
    }
}
