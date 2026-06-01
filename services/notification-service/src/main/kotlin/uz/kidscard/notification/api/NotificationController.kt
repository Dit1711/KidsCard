package uz.kidscard.notification.api

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.common.api.ApiResponse
import uz.kidscard.notification.api.dto.NotificationDto
import uz.kidscard.notification.api.dto.UnreadCountDto
import uz.kidscard.notification.service.NotificationService
import java.util.UUID

/**
 * Notifications are scoped to a family. The caller passes its familyId (the web
 * app holds it after loading the family). Authentication is required; a stricter
 * build would also verify family membership via family-service.
 */
@RestController
@RequestMapping("/api/v1/notifications")
class NotificationController(
    private val notificationService: NotificationService,
) {

    @GetMapping
    fun list(
        @RequestParam familyId: UUID,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "30") size: Int,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<List<NotificationDto>>> =
        ResponseEntity.ok(ApiResponse.ok(notificationService.list(familyId, page, size)))

    @GetMapping("/unread-count")
    fun unreadCount(
        @RequestParam familyId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<UnreadCountDto>> =
        ResponseEntity.ok(ApiResponse.ok(UnreadCountDto(notificationService.unreadCount(familyId))))

    @PostMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun markAllRead(
        @RequestParam familyId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ) {
        notificationService.markAllRead(familyId)
    }
}
