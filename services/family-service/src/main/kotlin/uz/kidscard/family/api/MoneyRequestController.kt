package uz.kidscard.family.api

import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.common.api.ApiResponse
import uz.kidscard.family.api.dto.MoneyRequestDto
import uz.kidscard.family.service.MoneyRequestService
import java.util.UUID

/** Parent inbox: review and resolve a child's money/limit requests. */
@RestController
@RequestMapping("/api/v1/families/{familyId}/money-requests")
class MoneyRequestController(
    private val moneyRequestService: MoneyRequestService,
) {

    @GetMapping
    fun list(
        @PathVariable familyId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<List<MoneyRequestDto>>> {
        val userId = UUID.fromString(jwt.subject)
        return ResponseEntity.ok(ApiResponse.ok(moneyRequestService.listForFamily(familyId, userId)))
    }

    @PostMapping("/{requestId}/approve")
    fun approve(
        @PathVariable familyId: UUID,
        @PathVariable requestId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<MoneyRequestDto>> {
        val userId = UUID.fromString(jwt.subject)
        val result = moneyRequestService.approve(requestId, familyId, userId, jwt.tokenValue)
        return ResponseEntity.ok(ApiResponse.ok(result))
    }

    @PostMapping("/{requestId}/decline")
    fun decline(
        @PathVariable familyId: UUID,
        @PathVariable requestId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<MoneyRequestDto>> {
        val userId = UUID.fromString(jwt.subject)
        val result = moneyRequestService.decline(requestId, familyId, userId)
        return ResponseEntity.ok(ApiResponse.ok(result))
    }
}
