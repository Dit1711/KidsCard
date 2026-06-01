package uz.kidscard.card.api

import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.card.api.dto.KidsCardDto
import uz.kidscard.card.service.CardService
import uz.kidscard.common.api.ApiResponse
import java.util.UUID

/**
 * Child cabinet endpoints. The child's JWT carries a `childId` claim, so reads
 * are scoped to exactly that child — no family-membership lookup needed.
 */
@RestController
@RequestMapping("/api/v1/child")
class ChildCardController(
    private val cardService: CardService,
) {

    @GetMapping("/cards")
    @PreAuthorize("hasRole('CHILD')")
    fun myCards(@AuthenticationPrincipal jwt: Jwt): ResponseEntity<ApiResponse<List<KidsCardDto>>> {
        val childId = UUID.fromString(jwt.getClaimAsString("childId"))
        return ResponseEntity.ok(ApiResponse.ok(cardService.getCardsForChildSelf(childId)))
    }
}
