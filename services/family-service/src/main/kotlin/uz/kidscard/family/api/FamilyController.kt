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
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.common.api.ApiResponse
import uz.kidscard.family.api.dto.AddCoParentRequest
import uz.kidscard.family.api.dto.CreateFamilyRequest
import uz.kidscard.family.api.dto.FamilyDto
import uz.kidscard.family.api.dto.ParentDto
import uz.kidscard.family.service.FamilyService
import java.util.UUID

@RestController
@RequestMapping("/api/v1/families")
class FamilyController(
    private val familyService: FamilyService,
) {

    @PostMapping
    fun createFamily(
        @Valid @RequestBody request: CreateFamilyRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<FamilyDto>> {
        val userId = UUID.fromString(jwt.subject)
        val phone = jwt.getClaim<String>("phone") ?: ""
        val result = familyService.createFamily(
            ownerUserId = userId,
            ownerPhone = phone,
            ownerFullName = request.fullName,
            familyName = request.familyName,
        )
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(result))
    }

    @GetMapping("/my")
    fun getMyFamily(
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<FamilyDto>> {
        val userId = UUID.fromString(jwt.subject)
        val result = familyService.getMyFamily(userId)
        return ResponseEntity.ok(ApiResponse.ok(result))
    }

    @GetMapping("/{familyId}")
    fun getFamily(
        @PathVariable familyId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<FamilyDto>> {
        val userId = UUID.fromString(jwt.subject)
        val result = familyService.getFamily(familyId, userId)
        return ResponseEntity.ok(ApiResponse.ok(result))
    }

    @PostMapping("/{familyId}/co-parents")
    fun addCoParent(
        @PathVariable familyId: UUID,
        @Valid @RequestBody request: AddCoParentRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<ParentDto>> {
        val userId = UUID.fromString(jwt.subject)
        val coParentUserId = UUID.fromString(request.userId)
        val result = familyService.addCoParent(
            familyId = familyId,
            requestingUserId = userId,
            coParentUserId = coParentUserId,
            phone = request.phone,
            fullName = request.fullName,
        )
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(result))
    }
}
