package uz.kidscard.notification.service

import org.slf4j.LoggerFactory
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.notification.api.dto.NotificationDto
import uz.kidscard.notification.api.dto.toDto
import uz.kidscard.notification.domain.Notification
import uz.kidscard.notification.domain.NotificationCategory
import uz.kidscard.notification.repository.NotificationRepository
import java.util.UUID

@Service
class NotificationService(
    private val notificationRepository: NotificationRepository,
    private val pushSender: PushSender,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Transactional
    fun create(
        familyId: UUID,
        category: NotificationCategory,
        title: String,
        message: String,
        icon: String,
        metadata: String? = null,
    ) {
        notificationRepository.save(
            Notification(
                familyId = familyId,
                category = category.name,
                title = title,
                message = message,
                icon = icon,
                metadata = metadata,
            ),
        )
        log.debug("Notification created: family={} category={} title={}", familyId, category, title)

        // Best-effort push to the family's devices (async, never blocks the feed write).
        pushSender.sendToFamily(familyId, title, message, icon)
    }

    @Transactional(readOnly = true)
    fun list(familyId: UUID, page: Int, size: Int): List<NotificationDto> =
        notificationRepository
            .findByFamilyIdOrderByCreatedAtDesc(familyId, PageRequest.of(page, size))
            .content
            .map { it.toDto() }

    @Transactional(readOnly = true)
    fun unreadCount(familyId: UUID): Long =
        notificationRepository.countByFamilyIdAndIsReadFalse(familyId)

    @Transactional
    fun markAllRead(familyId: UUID): Int =
        notificationRepository.markAllRead(familyId)
}
