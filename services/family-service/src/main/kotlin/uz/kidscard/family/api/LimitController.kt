package uz.kidscard.family.api

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.common.api.ApiResponse
import uz.kidscard.family.api.dto.LimitRuleDto
import uz.kidscard.family.api.dto.SetLimitRequest
import uz.kidscard.family.service.LimitService
import java.util.UUID

@RestController
@RequestMapping("/api/v1/families/{familyId}/children/{childId}/limits")
class LimitController(
    private val limitService: LimitService,
) {

    @PostMapping
    fun setLimit(
        @PathVariable familyId: UUID,
        @PathVariable childId: UUID,
        @Valid @RequestBody request: SetLimitRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<LimitRuleDto>> {
        val userId = UUID.fromString(jwt.subject)
        val result = limitService.setLimit(childId, familyId, userId, request)
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(result))
    }

    @GetMapping
    fun getLimits(
        @PathVariable familyId: UUID,
        @PathVariable childId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<List<LimitRuleDto>>> {
        val userId = UUID.fromString(jwt.subject)
        val result = limitService.getLimits(childId, familyId, userId)
        return ResponseEntity.ok(ApiResponse.ok(result))
    }

    @DeleteMapping("/{limitId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun removeLimit(
        @PathVariable familyId: UUID,
        @PathVariable childId: UUID,
        @PathVariable limitId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<Void> {
        val userId = UUID.fromString(jwt.subject)
        limitService.removeLimit(limitId, familyId, userId)
        return ResponseEntity.noContent().build()
    }
}
