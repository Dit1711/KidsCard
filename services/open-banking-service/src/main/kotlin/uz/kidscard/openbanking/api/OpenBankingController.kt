package uz.kidscard.openbanking.api

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.common.api.ApiResponse
import uz.kidscard.openbanking.api.dto.BankDto
import uz.kidscard.openbanking.api.dto.FundCardRequest
import uz.kidscard.openbanking.api.dto.FundResultDto
import uz.kidscard.openbanking.api.dto.LinkBankRequest
import uz.kidscard.openbanking.api.dto.LinkedAccountDto
import uz.kidscard.openbanking.service.OpenBankingService
import java.util.UUID

@RestController
@RequestMapping("/api/v1/open-banking")
class OpenBankingController(
    private val service: OpenBankingService,
) {

    /** Поддерживаемые банки */
    @GetMapping("/banks")
    fun banks(@AuthenticationPrincipal jwt: Jwt): ResponseEntity<ApiResponse<List<BankDto>>> =
        ResponseEntity.ok(ApiResponse.ok(service.supportedBanks()))

    /** Привязать банковский счёт (consent + AIS) */
    @PostMapping("/link")
    fun link(
        @Valid @RequestBody req: LinkBankRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<List<LinkedAccountDto>>> {
        val userId = UUID.fromString(jwt.subject)
        val result = service.linkBank(userId, req.bankCode)
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(result))
    }

    /** Привязанные счета с балансами (AIS) */
    @GetMapping("/accounts")
    fun accounts(@AuthenticationPrincipal jwt: Jwt): ResponseEntity<ApiResponse<List<LinkedAccountDto>>> {
        val userId = UUID.fromString(jwt.subject)
        return ResponseEntity.ok(ApiResponse.ok(service.getLinkedAccounts(userId)))
    }

    /** Пополнить карту ребёнка с банковского счёта (PIS) */
    @PostMapping("/fund-card")
    fun fundCard(
        @Valid @RequestBody req: FundCardRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<FundResultDto>> {
        val userId = UUID.fromString(jwt.subject)
        val result = service.fundCard(userId, req)
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(result))
    }
}
