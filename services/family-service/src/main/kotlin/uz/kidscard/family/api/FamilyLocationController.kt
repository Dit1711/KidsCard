package uz.kidscard.family.api

import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.common.api.ApiResponse
import uz.kidscard.family.api.dto.ChildLocationDto
import uz.kidscard.family.api.dto.LocationRequestDto
import uz.kidscard.family.service.ChildLocationService
import java.util.UUID

/** Parent: a child's location pings + on-demand "where are you now?" requests. */
@RestController
@RequestMapping("/api/v1/families/{familyId}/children/{childId}")
class FamilyLocationController(
    private val childLocationService: ChildLocationService,
) {
    /** Recent location pings (newest first). */
    @GetMapping("/locations")
    fun list(
        @PathVariable familyId: UUID,
        @PathVariable childId: UUID,
        @RequestParam(defaultValue = "30") days: Long,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<List<ChildLocationDto>>> {
        val userId = UUID.fromString(jwt.subject)
        return ResponseEntity.ok(ApiResponse.ok(childLocationService.getLocations(familyId, childId, userId, days)))
    }

    /** Ask the child's app to report its current location. */
    @PostMapping("/location-requests")
    fun request(
        @PathVariable familyId: UUID,
        @PathVariable childId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<LocationRequestDto>> {
        val userId = UUID.fromString(jwt.subject)
        return ResponseEntity.ok(ApiResponse.ok(childLocationService.createRequest(familyId, childId, userId)))
    }

    /** Poll a request's status/result. */
    @GetMapping("/location-requests/{requestId}")
    fun pollRequest(
        @PathVariable familyId: UUID,
        @PathVariable childId: UUID,
        @PathVariable requestId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<LocationRequestDto>> {
        val userId = UUID.fromString(jwt.subject)
        return ResponseEntity.ok(ApiResponse.ok(childLocationService.getRequest(familyId, requestId, userId)))
    }
}
