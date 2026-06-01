package uz.kidscard.notification.api.dto

import uz.kidscard.notification.domain.Notification
import java.time.Instant
import java.util.UUID

data class NotificationDto(
    val id: UUID,
    val category: String,
    val title: String,
    val message: String,
    val icon: String?,
    val isRead: Boolean,
    val createdAt: Instant,
)

data class UnreadCountDto(val unread: Long)

fun Notification.toDto() = NotificationDto(
    id = id,
    category = category,
    title = title,
    message = message,
    icon = icon,
    isRead = isRead,
    createdAt = createdAt,
)
