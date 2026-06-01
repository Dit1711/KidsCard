package uz.kidscard.notification.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant
import java.util.UUID

enum class NotificationCategory { PAYMENT, ALLOWANCE, LIMIT, KYC, FAMILY, CARD, CHORE, REQUEST }

@Entity
@Table(name = "notifications", schema = "notification")
class Notification(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "family_id", nullable = false)
    val familyId: UUID,

    @Column(name = "category", nullable = false)
    val category: String,

    @Column(name = "title", nullable = false)
    val title: String,

    @Column(name = "message", nullable = false)
    val message: String,

    @Column(name = "icon")
    val icon: String? = null,

    @Column(name = "is_read", nullable = false)
    var isRead: Boolean = false,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    val metadata: String? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),
)
