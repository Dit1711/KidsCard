package uz.kidscard.family.api

import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.common.api.ApiResponse
import uz.kidscard.family.api.dto.GamificationDto
import uz.kidscard.family.service.GamificationService
import java.util.UUID

/** Child cabinet: gamification snapshot (XP, level, streak, league, badges). */
@RestController
@RequestMapping("/api/v1/child/gamification")
class ChildGamificationController(
    private val gamificationService: GamificationService,
) {

    @GetMapping
    fun snapshot(@AuthenticationPrincipal jwt: Jwt): ResponseEntity<ApiResponse<GamificationDto>> {
        val childId = UUID.fromString(jwt.getClaimAsString("childId"))
        return ResponseEntity.ok(ApiResponse.ok(gamificationService.snapshot(childId)))
    }
}
