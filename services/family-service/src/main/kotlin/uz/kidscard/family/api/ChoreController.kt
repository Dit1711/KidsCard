package uz.kidscard.family.api

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
import uz.kidscard.family.api.dto.ChoreDto
import uz.kidscard.family.api.dto.CreateChoreRequest
import uz.kidscard.family.domain.ChoreStatus
import uz.kidscard.family.service.ChoreService
import java.util.UUID

@RestController
@RequestMapping("/api/v1/families/{familyId}/chores")
class ChoreController(
    private val choreService: ChoreService,
) {

    @PostMapping
    fun createChore(
        @PathVariable familyId: UUID,
        @Valid @RequestBody request: CreateChoreRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<ChoreDto>> {
        val userId = UUID.fromString(jwt.subject)
        val result = choreService.createChore(familyId, userId, request)
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(result))
    }

    @GetMapping
    fun getChores(
        @PathVariable familyId: UUID,
        @RequestParam(required = false) childId: UUID?,
        @RequestParam(required = false) status: ChoreStatus?,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<List<ChoreDto>>> {
        val userId = UUID.fromString(jwt.subject)
        val result = choreService.getChores(familyId, userId, childId, status)
        return ResponseEntity.ok(ApiResponse.ok(result))
    }

    @PostMapping("/{choreId}/complete")
    fun completeChore(
        @PathVariable familyId: UUID,
        @PathVariable choreId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<ChoreDto>> {
        val userId = UUID.fromString(jwt.subject)
        val result = choreService.completeChore(choreId, familyId, userId)
        return ResponseEntity.ok(ApiResponse.ok(result))
    }

    @PostMapping("/{choreId}/approve")
    fun approveChore(
        @PathVariable familyId: UUID,
        @PathVariable choreId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<ChoreDto>> {
        val userId = UUID.fromString(jwt.subject)
        val result = choreService.approveChore(choreId, familyId, userId)
        return ResponseEntity.ok(ApiResponse.ok(result))
    }
}
