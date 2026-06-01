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
import uz.kidscard.payment.api.dto.FundWalletRequest
import uz.kidscard.payment.api.dto.HoldRequest
import uz.kidscard.payment.api.dto.WalletDto
import uz.kidscard.payment.service.WalletService
import java.util.UUID

@RestController
@RequestMapping("/api/v1/wallet")
class WalletController(
    private val walletService: WalletService,
) {

    @GetMapping("/{familyId}")
    fun getWallet(
        @PathVariable familyId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<WalletDto>> =
        ResponseEntity.ok(ApiResponse.ok(walletService.getWallet(familyId)))

    /** Load money into the family wallet (dev: direct; prod: pulled from bank). */
    @PostMapping("/fund")
    fun fund(
        @RequestBody req: FundWalletRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<WalletDto>> =
        ResponseEntity.ok(ApiResponse.ok(walletService.fund(req.familyId, req.amountUzs)))

    /** Reserve funds (called by family-service when a chore is created). */
    @PostMapping("/hold")
    fun hold(
        @RequestBody req: HoldRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<WalletDto>> =
        ResponseEntity.ok(ApiResponse.ok(walletService.placeHold(req.familyId, req.reference, req.amountUzs)))

    /** Release a hold (called by family-service when a chore is rejected). */
    @PostMapping("/hold/{reference}/release")
    fun release(
        @PathVariable reference: String,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<Map<String, String>>> {
        walletService.release(reference)
        return ResponseEntity.ok(ApiResponse.ok(mapOf("status" to "released")))
    }
}
