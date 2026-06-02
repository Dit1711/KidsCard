package uz.kidscard.card.api

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.card.api.dto.IssueCardRequest
import uz.kidscard.card.api.dto.KidsCardDto
import uz.kidscard.card.api.dto.UpdateCardDesignRequest
import uz.kidscard.card.service.CardService
import uz.kidscard.common.api.ApiResponse
import java.util.UUID

@RestController
@RequestMapping("/api/v1/families/{familyId}/cards")
class CardController(
    private val cardService: CardService,
) {

    @PostMapping
    @PreAuthorize("hasAnyRole('PARENT_OWNER', 'PARENT_CO_OWNER')")
    fun issueCard(
        @PathVariable familyId: UUID,
        @Valid @RequestBody request: IssueCardRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<KidsCardDto>> {
        val requestingUserId = UUID.fromString(jwt.subject)
        val card = cardService.issueCard(
            childId = request.childId,
            familyId = familyId,
            cardType = request.cardType,
            network = request.network,
            requestingUserId = requestingUserId,
        )
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(card))
    }

    @GetMapping
    fun getCardsByFamily(
        @PathVariable familyId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<List<KidsCardDto>>> {
        val requestingUserId = UUID.fromString(jwt.subject)
        val cards = cardService.getCardsByFamily(familyId, requestingUserId)
        return ResponseEntity.ok(ApiResponse.ok(cards))
    }

    @GetMapping("/child/{childId}")
    fun getCardsByChild(
        @PathVariable familyId: UUID,
        @PathVariable childId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<List<KidsCardDto>>> {
        val requestingUserId = UUID.fromString(jwt.subject)
        val cards = cardService.getCardsByChild(familyId, childId, requestingUserId)
        return ResponseEntity.ok(ApiResponse.ok(cards))
    }

    @GetMapping("/{cardId}")
    fun getCard(
        @PathVariable familyId: UUID,
        @PathVariable cardId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<KidsCardDto>> {
        val requestingUserId = UUID.fromString(jwt.subject)
        val card = cardService.getCard(cardId, requestingUserId)
        return ResponseEntity.ok(ApiResponse.ok(card))
    }

    @PostMapping("/{cardId}/design")
    @PreAuthorize("hasAnyRole('PARENT_OWNER', 'PARENT_CO_OWNER')")
    fun updateDesign(
        @PathVariable familyId: UUID,
        @PathVariable cardId: UUID,
        @RequestBody request: UpdateCardDesignRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<KidsCardDto>> {
        val card = cardService.updateDesign(cardId, familyId, request.theme, request.pattern)
        return ResponseEntity.ok(ApiResponse.ok(card))
    }

    @PostMapping("/{cardId}/freeze")
    @PreAuthorize("hasAnyRole('PARENT_OWNER', 'PARENT_CO_OWNER')")
    fun freezeCard(
        @PathVariable familyId: UUID,
        @PathVariable cardId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<KidsCardDto>> {
        val parentId = UUID.fromString(jwt.subject)
        val card = cardService.freezeCard(cardId, parentId, familyId)
        return ResponseEntity.ok(ApiResponse.ok(card))
    }

    @PostMapping("/{cardId}/unfreeze")
    @PreAuthorize("hasAnyRole('PARENT_OWNER', 'PARENT_CO_OWNER')")
    fun unfreezeCard(
        @PathVariable familyId: UUID,
        @PathVariable cardId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<KidsCardDto>> {
        val parentId = UUID.fromString(jwt.subject)
        val card = cardService.unfreezeCard(cardId, parentId, familyId)
        return ResponseEntity.ok(ApiResponse.ok(card))
    }

    @PostMapping("/{cardId}/block")
    @PreAuthorize("hasAnyRole('PARENT_OWNER', 'PARENT_CO_OWNER')")
    fun blockCard(
        @PathVariable familyId: UUID,
        @PathVariable cardId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<KidsCardDto>> {
        val parentId = UUID.fromString(jwt.subject)
        val card = cardService.blockCard(cardId, parentId, familyId)
        return ResponseEntity.ok(ApiResponse.ok(card))
    }

    @PostMapping("/{cardId}/unblock")
    @PreAuthorize("hasAnyRole('PARENT_OWNER', 'PARENT_CO_OWNER')")
    fun unblockCard(
        @PathVariable familyId: UUID,
        @PathVariable cardId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<KidsCardDto>> {
        val parentId = UUID.fromString(jwt.subject)
        val card = cardService.unblockCard(cardId, parentId, familyId)
        return ResponseEntity.ok(ApiResponse.ok(card))
    }

    @PostMapping("/{cardId}/close")
    @PreAuthorize("hasAnyRole('PARENT_OWNER', 'PARENT_CO_OWNER')")
    fun closeCard(
        @PathVariable familyId: UUID,
        @PathVariable cardId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<KidsCardDto>> {
        val parentId = UUID.fromString(jwt.subject)
        val card = cardService.closeCard(cardId, parentId, familyId)
        return ResponseEntity.ok(ApiResponse.ok(card))
    }
}
