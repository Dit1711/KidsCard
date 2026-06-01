package uz.kidscard.auth.api

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
import uz.kidscard.auth.api.dto.ChildAccessResponse
import uz.kidscard.auth.api.dto.ChildLoginRequest
import uz.kidscard.auth.api.dto.ChildTokenResponse
import uz.kidscard.auth.api.dto.CreateChildAccessRequest
import uz.kidscard.auth.service.ChildAuthService
import uz.kidscard.common.api.ApiResponse
import java.util.UUID

@RestController
@RequestMapping("/api/v1/auth/child")
class ChildAuthController(
    private val childAuthService: ChildAuthService,
) {

    /** Parent issues (or resets) the child's login code + PIN. */
    @PostMapping("/access")
    fun createAccess(
        @Valid @RequestBody req: CreateChildAccessRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<ChildAccessResponse>> {
        val result = childAuthService.createAccess(req.childId, req.familyId, req.pin, req.displayName)
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(result))
    }

    /** Parent fetches the existing login code to re-share it. */
    @GetMapping("/access/{childId}")
    fun getAccess(
        @PathVariable childId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<ChildAccessResponse?>> =
        ResponseEntity.ok(ApiResponse.ok(childAuthService.getAccess(childId)))

    /** Public: the child logs in with their code + PIN. */
    @PostMapping("/login")
    fun login(
        @Valid @RequestBody req: ChildLoginRequest,
    ): ResponseEntity<ApiResponse<ChildTokenResponse>> =
        ResponseEntity.ok(ApiResponse.ok(childAuthService.login(req.loginCode, req.pin)))
}
