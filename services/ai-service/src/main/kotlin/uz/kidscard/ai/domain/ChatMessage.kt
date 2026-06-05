package uz.kidscard.ai.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/** One message in a child's tutor conversation (kept for context + parent visibility). */
@Entity
@Table(name = "chat_messages", schema = "ai")
class ChatMessage(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "child_id", nullable = false)
    val childId: UUID,

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    val role: ChatRole,

    @Column(name = "content", nullable = false, columnDefinition = "text")
    val content: String,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now(),
)

enum class ChatRole { USER, ASSISTANT }
