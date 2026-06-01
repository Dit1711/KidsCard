package uz.kidscard.family.api

import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.common.api.ApiResponse
import uz.kidscard.family.api.dto.ChoreDto
import uz.kidscard.family.service.ChoreService
import java.util.UUID

/**
 * Child cabinet chore endpoints. Scoped to the JWT childId claim — a child can
 * only see and complete their own chores. Gated to ROLE_CHILD in SecurityConfig.
 */
@RestController
@RequestMapping("/api/v1/child/chores")
class ChildChoreController(
    private val choreService: ChoreService,
) {

    @GetMapping
    fun myChores(@AuthenticationPrincipal jwt: Jwt): ResponseEntity<ApiResponse<List<ChoreDto>>> {
        val childId = UUID.fromString(jwt.getClaimAsString("childId"))
        return ResponseEntity.ok(ApiResponse.ok(choreService.getChildChores(childId)))
    }

    @PostMapping("/{choreId}/complete")
    fun complete(
        @PathVariable choreId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<ChoreDto>> {
        val childId = UUID.fromString(jwt.getClaimAsString("childId"))
        return ResponseEntity.ok(ApiResponse.ok(choreService.childCompleteChore(choreId, childId)))
    }
}
