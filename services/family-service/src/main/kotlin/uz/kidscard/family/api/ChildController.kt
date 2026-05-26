package uz.kidscard.family.api

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.common.api.ApiResponse
import uz.kidscard.family.api.dto.AddChildRequest
import uz.kidscard.family.api.dto.ChildDto
import uz.kidscard.family.api.dto.UpdateChildRequest
import uz.kidscard.family.service.ChildService
import java.util.UUID

@RestController
@RequestMapping("/api/v1/families/{familyId}/children")
class ChildController(
    private val childService: ChildService,
) {

    @PostMapping
    fun addChild(
        @PathVariable familyId: UUID,
        @Valid @RequestBody request: AddChildRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<ChildDto>> {
        val userId = UUID.fromString(jwt.subject)
        val result = childService.addChild(familyId, userId, request)
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(result))
    }

    @GetMapping
    fun getChildren(
        @PathVariable familyId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<List<ChildDto>>> {
        val userId = UUID.fromString(jwt.subject)
        val result = childService.getChildren(familyId, userId)
        return ResponseEntity.ok(ApiResponse.ok(result))
    }

    @GetMapping("/{childId}")
    fun getChild(
        @PathVariable familyId: UUID,
        @PathVariable childId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<ChildDto>> {
        val userId = UUID.fromString(jwt.subject)
        val result = childService.getChild(childId, familyId, userId)
        return ResponseEntity.ok(ApiResponse.ok(result))
    }

    @PutMapping("/{childId}")
    fun updateChild(
        @PathVariable familyId: UUID,
        @PathVariable childId: UUID,
        @RequestBody request: UpdateChildRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<ChildDto>> {
        val userId = UUID.fromString(jwt.subject)
        val result = childService.updateChild(childId, familyId, userId, request)
        return ResponseEntity.ok(ApiResponse.ok(result))
    }
}
