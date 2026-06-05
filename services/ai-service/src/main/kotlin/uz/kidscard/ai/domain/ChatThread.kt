package uz.kidscard.ai.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/** A separate conversation ("topic") a child has with the tutor — own context. */
@Entity
@Table(name = "chat_threads", schema = "ai")
class ChatThread(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "child_id", nullable = false)
    val childId: UUID,

    /** Short auto-title from the first message (null until the first exchange). */
    @Column(name = "title", length = 120)
    var title: String? = null,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),
)
