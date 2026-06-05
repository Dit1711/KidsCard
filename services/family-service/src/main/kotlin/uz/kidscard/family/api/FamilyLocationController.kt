package uz.kidscard.family.api

import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.common.api.ApiResponse
import uz.kidscard.family.api.dto.ChildLocationDto
import uz.kidscard.family.service.ChildLocationService
import java.util.UUID

/** Parent: read a child's recent location pings (last known place + spend map). */
@RestController
@RequestMapping("/api/v1/families/{familyId}/children/{childId}/locations")
class FamilyLocationController(
    private val childLocationService: ChildLocationService,
) {
    @GetMapping
    fun list(
        @PathVariable familyId: UUID,
        @PathVariable childId: UUID,
        @RequestParam(defaultValue = "30") days: Long,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<List<ChildLocationDto>>> {
        val userId = UUID.fromString(jwt.subject)
        return ResponseEntity.ok(ApiResponse.ok(childLocationService.getLocations(familyId, childId, userId, days)))
    }
}
