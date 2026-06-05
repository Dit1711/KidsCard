package uz.kidscard.ai.api.dto

import java.time.Instant
import java.util.UUID

data class ChatRequest(
    val message: String = "",
    val threadId: UUID? = null,
    /** Optional base64 image (no data: prefix) + its media type, e.g. "image/jpeg". */
    val imageBase64: String? = null,
    val imageMediaType: String? = null,
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
