package uz.kidscard.ai.api.dto

import jakarta.validation.constraints.NotBlank
import java.time.Instant

data class ChatRequest(
    @field:NotBlank val message: String,
)

data class ChatReplyDto(
    val reply: String,
    val limited: Boolean,
)

data class ChatMessageDto(
    val role: String, // USER / ASSISTANT
    val content: String,
    val createdAt: Instant,
)
