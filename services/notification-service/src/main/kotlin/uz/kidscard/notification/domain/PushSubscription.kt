package uz.kidscard.notification.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/** A browser/device that opted in to Web Push, scoped to a family. */
@Entity
@Table(name = "push_subscriptions", schema = "notification")
class PushSubscription(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "family_id", nullable = false)
    val familyId: UUID,

    @Column(name = "endpoint", nullable = false, unique = true)
    val endpoint: String,

    @Column(name = "p256dh", nullable = false)
    var p256dh: String,

    @Column(name = "auth", nullable = false)
    var auth: String,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),
)
