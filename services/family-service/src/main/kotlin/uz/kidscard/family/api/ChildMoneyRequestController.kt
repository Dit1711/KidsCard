package uz.kidscard.family.api

import jakarta.validation.constraints.Min
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
import uz.kidscard.family.api.dto.MoneyRequestDto
import uz.kidscard.family.domain.RequestType
import uz.kidscard.family.service.MoneyRequestService
import java.util.UUID

data class CreateMoneyRequestRequest(
    val type: RequestType,
    @field:Min(1) val amountUzs: Long,
    val cardId: UUID? = null,
    val limitType: String? = null,
    val category: String? = null,
    val note: String? = null,
)

/** Child cabinet: ask a parent for money or a higher limit, and see request status. */
@RestController
@RequestMapping("/api/v1/child/money-requests")
class ChildMoneyRequestController(
    private val moneyRequestService: MoneyRequestService,
) {

    @GetMapping
    fun myRequests(@AuthenticationPrincipal jwt: Jwt): ResponseEntity<ApiResponse<List<MoneyRequestDto>>> {
        val childId = UUID.fromString(jwt.getClaimAsString("childId"))
        return ResponseEntity.ok(ApiResponse.ok(moneyRequestService.listForChild(childId)))
    }

    @PostMapping
    fun create(
        @RequestBody req: CreateMoneyRequestRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<MoneyRequestDto>> {
        val childId = UUID.fromString(jwt.getClaimAsString("childId"))
        val familyId = UUID.fromString(jwt.getClaimAsString("familyId"))
        val result = moneyRequestService.childCreate(
            childId, familyId, req.type, req.amountUzs, req.cardId, req.limitType, req.category, req.note,
        )
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(result))
    }
}
