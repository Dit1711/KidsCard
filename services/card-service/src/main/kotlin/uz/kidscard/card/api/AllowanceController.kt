package uz.kidscard.card.api

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.card.api.dto.AllowanceScheduleDto
import uz.kidscard.card.api.dto.SetAllowanceRequest
import uz.kidscard.card.service.AllowanceService
import uz.kidscard.common.api.ApiResponse
import java.util.UUID

@RestController
@RequestMapping("/api/v1/families/{familyId}/cards/{cardId}/allowance")
class AllowanceController(
    private val allowanceService: AllowanceService,
) {

    @PostMapping
    @PreAuthorize("hasAnyRole('PARENT_OWNER', 'PARENT_CO_OWNER')")
    fun setAllowance(
        @PathVariable familyId: UUID,
        @PathVariable cardId: UUID,
        @Valid @RequestBody request: SetAllowanceRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<AllowanceScheduleDto>> {
        val schedule = allowanceService.setAllowance(
            cardId = cardId,
            familyId = familyId,
            amountUzs = request.amountUzs,
            frequency = request.frequency,
            dayOfWeek = request.dayOfWeek,
            dayOfMonth = request.dayOfMonth,
        )
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(schedule))
    }

    @GetMapping
    fun getActiveAllowance(
        @PathVariable familyId: UUID,
        @PathVariable cardId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<AllowanceScheduleDto?>> {
        val schedule = allowanceService.getActiveAllowance(cardId)
        return ResponseEntity.ok(ApiResponse.ok(schedule))
    }
}
