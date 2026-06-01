package uz.kidscard.notification.repository

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import uz.kidscard.notification.domain.Notification
import java.util.UUID

interface NotificationRepository : JpaRepository<Notification, UUID> {

    fun findByFamilyIdOrderByCreatedAtDesc(familyId: UUID, pageable: Pageable): Page<Notification>

    fun countByFamilyIdAndIsReadFalse(familyId: UUID): Long

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.familyId = :familyId AND n.isRead = false")
    fun markAllRead(@Param("familyId") familyId: UUID): Int
}
