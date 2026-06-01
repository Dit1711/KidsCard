package uz.kidscard.family.api

import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotNull
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
import uz.kidscard.family.api.dto.SavingsGoalDto
import uz.kidscard.family.service.SavingsGoalService
import java.util.UUID

data class ContributeRequest(
    @field:NotNull @field:Min(100) val amountUzs: Long,
)

/** Parent view of children's savings goals + gifting from the family wallet. */
@RestController
@RequestMapping("/api/v1/families/{familyId}/savings-goals")
class SavingsGoalController(
    private val savingsGoalService: SavingsGoalService,
) {

    @GetMapping
    fun list(
        @PathVariable familyId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<List<SavingsGoalDto>>> {
        val userId = UUID.fromString(jwt.subject)
        return ResponseEntity.ok(ApiResponse.ok(savingsGoalService.getFamilyGoals(familyId, userId)))
    }

    @PostMapping("/{goalId}/contribute")
    fun contribute(
        @PathVariable familyId: UUID,
        @PathVariable goalId: UUID,
        @RequestBody req: ContributeRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<SavingsGoalDto>> {
        val userId = UUID.fromString(jwt.subject)
        val result = savingsGoalService.contribute(goalId, familyId, userId, req.amountUzs, jwt.tokenValue)
        return ResponseEntity.ok(ApiResponse.ok(result))
    }
}
