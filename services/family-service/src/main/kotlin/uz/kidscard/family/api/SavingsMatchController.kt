package uz.kidscard.family.api

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.common.api.ApiResponse
import uz.kidscard.family.api.dto.SavingsMatchDto
import uz.kidscard.family.service.FamilyService
import uz.kidscard.family.service.SavingsMatchService
import java.util.UUID

data class UpdateSavingsMatchRequest(
    @field:Min(0) @field:Max(200) val percent: Int = 0,
    @field:Min(0) val monthlyCapUzs: Long? = null,
)

/** Parent cabinet: configure the savings match for one child (SAV-04). */
@RestController
@RequestMapping("/api/v1/families/{familyId}/children/{childId}/savings-match")
class SavingsMatchController(
    private val savingsMatchService: SavingsMatchService,
    private val familyService: FamilyService,
) {
    @GetMapping
    fun get(
        @PathVariable familyId: UUID,
        @PathVariable childId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<SavingsMatchDto>> {
        familyService.requireMember(familyId, UUID.fromString(jwt.subject))
        val s = savingsMatchService.settings(childId)
        return ResponseEntity.ok(ApiResponse.ok(SavingsMatchDto(s.percent, s.monthlyCapUzs, s.usedThisMonthUzs)))
    }

    @PutMapping
    fun update(
        @PathVariable familyId: UUID,
        @PathVariable childId: UUID,
        @RequestBody request: UpdateSavingsMatchRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<SavingsMatchDto>> {
        familyService.requireOwner(familyId, UUID.fromString(jwt.subject))
        val s = savingsMatchService.update(childId, request.percent, request.monthlyCapUzs)
        return ResponseEntity.ok(ApiResponse.ok(SavingsMatchDto(s.percent, s.monthlyCapUzs, s.usedThisMonthUzs)))
    }
}
