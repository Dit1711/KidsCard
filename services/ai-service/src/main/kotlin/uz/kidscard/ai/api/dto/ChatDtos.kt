package uz.kidscard.ai.api.dto

import jakarta.validation.constraints.NotBlank
import java.time.Instant
import java.util.UUID

data class ChatRequest(
    @field:NotBlank val message: String,
    val threadId: UUID? = null,
)

data class ChatReplyDto(
    val reply: String,
    val limited: Boolean,
    val threadId: UUID?,
    val threadTitle: String?,
)

data class ThreadDto(
    val id: UUID,
    val title: String?,
    val updatedAt: Instant,
)

data class ChatMessageDto(
    val role: String, // USER / ASSISTANT
    val content: String,
    val createdAt: Instant,
)
