package uz.kidscard.family.api

import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.common.api.ApiResponse
import uz.kidscard.family.api.dto.LimitRuleDto
import uz.kidscard.family.service.LimitService
import java.util.UUID

/** Child-scoped limits (ROLE_CHILD). Used by payment-service at spend time. */
@RestController
@RequestMapping("/api/v1/child/limits")
class ChildLimitController(
    private val limitService: LimitService,
) {

    @GetMapping
    fun myLimits(@AuthenticationPrincipal jwt: Jwt): ResponseEntity<ApiResponse<List<LimitRuleDto>>> {
        val childId = UUID.fromString(jwt.getClaimAsString("childId"))
        return ResponseEntity.ok(ApiResponse.ok(limitService.getChildLimits(childId)))
    }
}
