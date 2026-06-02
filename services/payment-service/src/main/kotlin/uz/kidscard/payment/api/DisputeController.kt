package uz.kidscard.payment.api

import jakarta.validation.Valid
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
import uz.kidscard.payment.api.dto.DisputeDto
import uz.kidscard.payment.api.dto.RaiseDisputeRequest
import uz.kidscard.payment.service.DisputeService
import java.util.UUID

/** Parent-facing transaction disputes. */
@RestController
@RequestMapping("/api/v1/disputes")
class DisputeController(
    private val disputeService: DisputeService,
) {

    @PostMapping
    fun raise(
        @Valid @RequestBody req: RaiseDisputeRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<DisputeDto>> {
        val userId = UUID.fromString(jwt.subject)
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(disputeService.raise(req, userId)))
    }

    @GetMapping("/family/{familyId}")
    fun listByFamily(
        @PathVariable familyId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<List<DisputeDto>>> =
        ResponseEntity.ok(ApiResponse.ok(disputeService.listByFamily(familyId)))

    @GetMapping("/transaction/{transactionId}")
    fun getByTransaction(
        @PathVariable transactionId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<List<DisputeDto>>> =
        ResponseEntity.ok(ApiResponse.ok(disputeService.getByTransaction(transactionId)))

    @PostMapping("/{disputeId}/withdraw")
    fun withdraw(
        @PathVariable disputeId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<DisputeDto>> {
        val userId = UUID.fromString(jwt.subject)
        return ResponseEntity.ok(ApiResponse.ok(disputeService.withdraw(disputeId, userId)))
    }
}
