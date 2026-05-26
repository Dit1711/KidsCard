package uz.kidscard.auth.api

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.auth.api.dto.LoginRequest
import uz.kidscard.auth.api.dto.LogoutRequest
import uz.kidscard.auth.api.dto.RefreshRequest
import uz.kidscard.auth.api.dto.RegisterRequest
import uz.kidscard.auth.api.dto.TokenResponse
import uz.kidscard.auth.api.dto.UserResponse
import uz.kidscard.auth.api.dto.VerifyLoginRequest
import uz.kidscard.auth.api.dto.VerifyOtpRequest
import uz.kidscard.auth.api.dto.toResponse
import uz.kidscard.auth.service.AuthService
import uz.kidscard.common.api.ApiResponse
import java.util.UUID

@RestController
@RequestMapping("/api/v1/auth")
@Validated
class AuthController(private val authService: AuthService) {

    @PostMapping("/register")
    fun register(
        @Valid @RequestBody req: RegisterRequest,
    ): ResponseEntity<ApiResponse<Map<String, String>>> {
        authService.register(req.phone)
        return ResponseEntity.ok(
            ApiResponse.ok(mapOf("message" to "OTP sent to ${req.phone}")),
        )
    }

    @PostMapping("/register/verify")
    fun verifyRegistration(
        @Valid @RequestBody req: VerifyOtpRequest,
    ): ResponseEntity<ApiResponse<TokenResponse>> {
        val tokens = authService.verifyRegistration(req.phone, req.otp)
        return ResponseEntity.ok(ApiResponse.ok(tokens))
    }

    @PostMapping("/login")
    fun login(
        @Valid @RequestBody req: LoginRequest,
    ): ResponseEntity<ApiResponse<Map<String, String>>> {
        authService.login(req.phone)
        return ResponseEntity.ok(
            ApiResponse.ok(mapOf("message" to "OTP sent to ${req.phone}")),
        )
    }

    @PostMapping("/login/verify")
    fun verifyLogin(
        @Valid @RequestBody req: VerifyLoginRequest,
    ): ResponseEntity<ApiResponse<TokenResponse>> {
        val tokens = authService.verifyLogin(req.phone, req.otp, req.deviceId)
        return ResponseEntity.ok(ApiResponse.ok(tokens))
    }

    @PostMapping("/refresh")
    fun refresh(
        @Valid @RequestBody req: RefreshRequest,
    ): ResponseEntity<ApiResponse<TokenResponse>> {
        val tokens = authService.refresh(req.refreshToken)
        return ResponseEntity.ok(ApiResponse.ok(tokens))
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun logout(@Valid @RequestBody req: LogoutRequest) {
        authService.logout(req.refreshToken)
    }

    @GetMapping("/me")
    fun me(
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<UserResponse>> {
        val userId = UUID.fromString(jwt.subject)
        val user = authService.getCurrentUser(userId)
        return ResponseEntity.ok(ApiResponse.ok(user.toResponse()))
    }
}
