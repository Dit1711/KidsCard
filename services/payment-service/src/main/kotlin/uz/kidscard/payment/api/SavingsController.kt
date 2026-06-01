package uz.kidscard.payment.api

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
import uz.kidscard.payment.service.SavingsService
import java.util.UUID

data class SavingsMoveRequest(
    val cardId: UUID,
    val childId: UUID,
    val familyId: UUID,
    val goalId: UUID,
    val amountUzs: Long,
)

/**
 * Savings-pot money moves, called by family-service (which orchestrates goals
 * and forwards the caller's token).
 */
@RestController
@RequestMapping("/api/v1/savings")
class SavingsController(
    private val savingsService: SavingsService,
) {

    @PostMapping("/deposit")
    fun deposit(
        @RequestBody req: SavingsMoveRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<Map<String, Long>>> {
        val saved = savingsService.deposit(req.cardId, req.childId, req.familyId, req.goalId, req.amountUzs)
        return ResponseEntity.ok(ApiResponse.ok(mapOf("saved" to saved)))
    }

    @PostMapping("/withdraw")
    fun withdraw(
        @RequestBody req: SavingsMoveRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<Map<String, Long>>> {
        val saved = savingsService.withdraw(req.cardId, req.childId, req.familyId, req.goalId, req.amountUzs)
        return ResponseEntity.ok(ApiResponse.ok(mapOf("saved" to saved)))
    }

    @GetMapping("/{goalId}/balance")
    fun balance(
        @PathVariable goalId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<Map<String, Long>>> =
        ResponseEntity.ok(ApiResponse.ok(mapOf("saved" to savingsService.saved(goalId))))
}
