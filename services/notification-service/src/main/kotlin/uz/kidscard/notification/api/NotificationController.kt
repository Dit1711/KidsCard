package uz.kidscard.notification.api

import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import uz.kidscard.common.api.ApiResponse
import uz.kidscard.notification.api.dto.NotificationDto
import uz.kidscard.notification.api.dto.UnreadCountDto
import uz.kidscard.notification.service.NotificationService
import uz.kidscard.notification.service.PushSender
import java.util.UUID

data class PushKeys(val p256dh: String, val auth: String)
data class PushSubscribeRequest(val endpoint: String, val keys: PushKeys)

/**
 * Notifications are scoped to a family. The caller passes its familyId (the web
 * app holds it after loading the family). Authentication is required; a stricter
 * build would also verify family membership via family-service.
 */
@RestController
@RequestMapping("/api/v1/notifications")
class NotificationController(
    private val notificationService: NotificationService,
    private val pushSender: PushSender,
    @Value("\${app.push.vapid.public-key}") private val vapidPublicKey: String,
) {

    /** The VAPID public key the browser needs to create a push subscription. */
    @GetMapping("/push/vapid-key")
    fun vapidKey(@AuthenticationPrincipal jwt: Jwt): ResponseEntity<ApiResponse<Map<String, String>>> =
        ResponseEntity.ok(ApiResponse.ok(mapOf("publicKey" to vapidPublicKey)))

    /** Register this browser/device for push under the given family. */
    @PostMapping("/push/subscribe")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun subscribe(
        @RequestParam familyId: UUID,
        @RequestBody req: PushSubscribeRequest,
        @AuthenticationPrincipal jwt: Jwt,
    ) {
        pushSender.subscribe(familyId, req.endpoint, req.keys.p256dh, req.keys.auth)
    }

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
