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
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.common.api.ApiResponse
import uz.kidscard.payment.api.dto.BalanceDto
import uz.kidscard.payment.api.dto.PageDto
import uz.kidscard.payment.api.dto.PurchaseRequest
import uz.kidscard.payment.api.dto.TopUpRequest
import uz.kidscard.payment.api.dto.TransactionDto
import uz.kidscard.payment.service.TransactionService
import java.util.UUID

@RestController
@RequestMapping("/api/v1")
class TransactionController(
    private val transactionService: TransactionService,
) {

    /** Пополнение карты (родитель → карта ребёнка) */
    @PostMapping("/transactions/top-up")
    fun topUp(
        @Valid @RequestBody req: TopUpRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<TransactionDto>> {
        val result = transactionService.topUp(req)
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(result))
    }

    /** Симуляция покупки (для тестирования) */
    @PostMapping("/transactions/purchase")
    fun purchase(
        @Valid @RequestBody req: PurchaseRequest,
        @AuthenticationPrincipal jwt: Jwt,
        request: jakarta.servlet.http.HttpServletRequest,
    ): ResponseEntity<ApiResponse<TransactionDto>> {
        val token = request.getHeader("Authorization")?.removePrefix("Bearer ")
        val result = transactionService.purchase(req, token)
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(result))
    }

    /** Баланс карты по ledger */
    @GetMapping("/wallets/cards/{cardId}/balance")
    fun getBalance(
        @PathVariable cardId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<BalanceDto>> {
        val result = transactionService.getBalance(cardId)
        return ResponseEntity.ok(ApiResponse.ok(result))
    }

    /** История транзакций по карте */
    @GetMapping("/transactions/card/{cardId}")
    fun getByCard(
        @PathVariable cardId: UUID,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<PageDto<TransactionDto>>> {
        val result = transactionService.getByCard(cardId, page, size)
        return ResponseEntity.ok(ApiResponse.ok(result))
    }

    /** История транзакций по семье */
    @GetMapping("/transactions/family/{familyId}")
    fun getByFamily(
        @PathVariable familyId: UUID,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<PageDto<TransactionDto>>> {
        val result = transactionService.getByFamily(familyId, page, size)
        return ResponseEntity.ok(ApiResponse.ok(result))
    }
}
