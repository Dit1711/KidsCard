package uz.kidscard.family.api

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
import uz.kidscard.family.api.dto.ChildLocationDto
import uz.kidscard.family.api.dto.FulfillLocationRequest
import uz.kidscard.family.api.dto.LocationPingRequest
import uz.kidscard.family.api.dto.LocationRequestDto
import uz.kidscard.family.service.ChildLocationService
import java.util.UUID

/**
 * Child cabinet: report a one-shot geolocation ping (with the child app's
 * consent). Gated to ROLE_CHILD; scoped to the JWT childId.
 */
@RestController
@RequestMapping("/api/v1/child/location")
class ChildLocationController(
    private val childLocationService: ChildLocationService,
) {
    @PostMapping
    fun report(
        @RequestBody request: LocationPingRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<ChildLocationDto>> {
        val childId = UUID.fromString(jwt.getClaimAsString("childId"))
        return ResponseEntity.ok(ApiResponse.ok(childLocationService.recordPing(childId, request)))
    }

    /** Child app polls for a pending "where are you?" request from a parent. */
    @GetMapping("/requests/pending")
    fun pending(@AuthenticationPrincipal jwt: Jwt): ResponseEntity<ApiResponse<LocationRequestDto?>> {
        val childId = UUID.fromString(jwt.getClaimAsString("childId"))
        return ResponseEntity.ok(ApiResponse.ok(childLocationService.pendingForChild(childId)))
    }

    /** Child app fulfills a pending request with its current location. */
    @PostMapping("/requests/{requestId}/fulfill")
    fun fulfill(
        @PathVariable requestId: UUID,
        @RequestBody body: FulfillLocationRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<LocationRequestDto>> {
        val childId = UUID.fromString(jwt.getClaimAsString("childId"))
        return ResponseEntity.ok(ApiResponse.ok(childLocationService.fulfillRequest(childId, requestId, body)))
    }
}
