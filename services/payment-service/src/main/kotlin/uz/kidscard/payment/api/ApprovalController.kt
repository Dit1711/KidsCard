package uz.kidscard.payment.api

import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.common.api.ApiResponse
import uz.kidscard.payment.api.dto.TransactionDto
import uz.kidscard.payment.service.TransactionService
import java.util.UUID

/**
 * Parent cabinet: review purchases a child made above the approval threshold
 * (PC-05) and approve (capture) or decline (refund) them.
 */
@RestController
@RequestMapping("/api/v1/approvals")
class ApprovalController(
    private val transactionService: TransactionService,
) {
    @GetMapping
    fun pending(
        @RequestParam familyId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<List<TransactionDto>>> =
        ResponseEntity.ok(ApiResponse.ok(transactionService.listPendingApprovals(familyId)))

    @PostMapping("/{transactionId}/approve")
    fun approve(
        @PathVariable transactionId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<TransactionDto>> =
        ResponseEntity.ok(ApiResponse.ok(transactionService.approvePurchase(transactionId)))

    @PostMapping("/{transactionId}/decline")
    fun decline(
        @PathVariable transactionId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<TransactionDto>> =
        ResponseEntity.ok(ApiResponse.ok(transactionService.declinePurchase(transactionId)))
}
