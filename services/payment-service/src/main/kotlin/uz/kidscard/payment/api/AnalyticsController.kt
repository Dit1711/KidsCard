package uz.kidscard.payment.api

import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.common.api.ApiResponse
import uz.kidscard.payment.api.dto.SpendAnalyticsDto
import uz.kidscard.payment.service.AnalyticsService
import java.util.UUID

/** Parent analytics: spend breakdown for a child's card. */
@RestController
@RequestMapping("/api/v1/analytics")
class AnalyticsController(
    private val analyticsService: AnalyticsService,
) {

    @GetMapping("/card/{cardId}")
    fun cardSpend(
        @PathVariable cardId: UUID,
        @RequestParam(defaultValue = "30") days: Int,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<SpendAnalyticsDto>> {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.cardSpend(cardId, days)))
    }
}
