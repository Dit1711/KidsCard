package uz.kidscard.family.api

import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
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
import uz.kidscard.family.api.dto.SavingsGoalDto
import uz.kidscard.family.service.SavingsGoalService
import java.time.LocalDate
import java.util.UUID

data class CreateGoalRequest(
    @field:NotBlank val title: String,
    @field:NotNull @field:Min(1000) val targetAmount: Long,
    val deadline: LocalDate? = null,
    val imageUrl: String? = null,
)

data class SavingsMoveBody(
    @field:NotNull val cardId: UUID,
    @field:NotNull @field:Min(100) val amountUzs: Long,
)

/** Child cabinet: the child manages and funds their own savings goals. */
@RestController
@RequestMapping("/api/v1/child/savings-goals")
class ChildSavingsController(
    private val savingsGoalService: SavingsGoalService,
) {

    @GetMapping
    fun myGoals(@AuthenticationPrincipal jwt: Jwt): ResponseEntity<ApiResponse<List<SavingsGoalDto>>> {
        val childId = UUID.fromString(jwt.getClaimAsString("childId"))
        return ResponseEntity.ok(ApiResponse.ok(savingsGoalService.getGoals(childId)))
    }

    @PostMapping
    fun create(
        @RequestBody req: CreateGoalRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<SavingsGoalDto>> {
        val childId = UUID.fromString(jwt.getClaimAsString("childId"))
        val result = savingsGoalService.createGoal(childId, req.title, req.targetAmount, req.deadline, req.imageUrl)
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(result))
    }

    @PostMapping("/{goalId}/deposit")
    fun deposit(
        @PathVariable goalId: UUID,
        @RequestBody req: SavingsMoveBody,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<SavingsGoalDto>> {
        val childId = UUID.fromString(jwt.getClaimAsString("childId"))
        val familyId = UUID.fromString(jwt.getClaimAsString("familyId"))
        val result = savingsGoalService.deposit(goalId, childId, familyId, req.cardId, req.amountUzs, jwt.tokenValue)
        return ResponseEntity.ok(ApiResponse.ok(result))
    }

    @PostMapping("/{goalId}/withdraw")
    fun withdraw(
        @PathVariable goalId: UUID,
        @RequestBody req: SavingsMoveBody,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<SavingsGoalDto>> {
        val childId = UUID.fromString(jwt.getClaimAsString("childId"))
        val familyId = UUID.fromString(jwt.getClaimAsString("familyId"))
        val result = savingsGoalService.withdraw(goalId, childId, familyId, req.cardId, req.amountUzs, jwt.tokenValue)
        return ResponseEntity.ok(ApiResponse.ok(result))
    }
}
