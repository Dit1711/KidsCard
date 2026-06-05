package uz.kidscard.family.api

import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.common.api.ApiResponse
import uz.kidscard.family.api.dto.ChildLocationDto
import uz.kidscard.family.api.dto.LocationPingRequest
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
}
