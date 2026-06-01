package uz.kidscard.payment.api

import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.common.api.ApiResponse
import uz.kidscard.payment.api.dto.BalanceDto
import uz.kidscard.payment.api.dto.PageDto
import uz.kidscard.payment.api.dto.TransactionDto
import uz.kidscard.payment.service.TransactionService
import java.util.UUID

/**
 * Child cabinet read endpoints (ROLE_CHILD only, enforced in SecurityConfig).
 * The child passes its own cardId, obtained from card-service's child endpoint.
 */
@RestController
@RequestMapping("/api/v1/child")
class ChildPaymentController(
    private val transactionService: TransactionService,
) {

    @GetMapping("/balance")
    fun balance(
        @RequestParam cardId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<BalanceDto>> =
        ResponseEntity.ok(ApiResponse.ok(transactionService.getBalance(cardId)))

    @GetMapping("/transactions")
    fun transactions(
        @RequestParam cardId: UUID,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<PageDto<TransactionDto>>> =
        ResponseEntity.ok(ApiResponse.ok(transactionService.getByCard(cardId, page, size)))
}
