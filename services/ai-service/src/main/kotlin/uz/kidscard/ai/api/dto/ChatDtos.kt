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
    /** Parent has switched the tutor off for this child. */
    val disabled: Boolean = false,
)

/** Parent view/update of a child's AI controls. */
data class AiSettingsDto(
    val enabled: Boolean,
    val dailyLimit: Int,
    val dailyLimitCustom: Boolean,
)

data class UpdateAiSettingsRequest(
    val familyId: UUID,
    val childId: UUID,
    val enabled: Boolean = true,
    /** null clears any override and reverts to the global default. */
    val dailyLimit: Int? = null,
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
