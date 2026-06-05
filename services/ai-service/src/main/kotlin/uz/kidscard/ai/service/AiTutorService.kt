package uz.kidscard.ai.service

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.ai.domain.ChatMessage
import uz.kidscard.ai.domain.ChatRole
import uz.kidscard.ai.domain.ChatThread
import uz.kidscard.ai.repository.ChatMessageRepository
import uz.kidscard.ai.repository.ChatThreadRepository
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

/** Result of one tutor turn. `limited` = the child hit today's message cap. */
data class ChatReply(
    val reply: String,
    val limited: Boolean,
    val threadId: UUID?,
    val threadTitle: String?,
    /** The parent has turned the tutor off for this child. */
    val disabled: Boolean = false,
)

@Service
@Transactional
class AiTutorService(
    private val chatMessageRepository: ChatMessageRepository,
    private val chatThreadRepository: ChatThreadRepository,
    private val engine: LlmEngine,
    private val settingsService: AiSettingsService,
    @Value("\${app.ai.history-turns}") private val historyTurns: Int,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val zone = ZoneId.of("Asia/Tashkent")

    /** Send a message within a thread (a new one is created when threadId is null). */
    fun chat(
        childId: UUID,
        threadId: UUID?,
        userText: String,
        imageBase64: String? = null,
        imageMediaType: String? = null,
    ): ChatReply {
        // Drop oversized images defensively (frontend already downscales).
        val image = imageBase64?.takeIf { it.length in 1..8_000_000 }
        val text = userText.trim().take(4000).ifBlank { if (image != null) "📷" else "" }
        if (text.isBlank()) return ChatReply("", limited = false, threadId = threadId, threadTitle = null)

        // Parental consent gate + per-child daily cap.
        val settings = settingsService.effective(childId)
        if (!settings.enabled) {
            return ChatReply("", limited = false, threadId = threadId, threadTitle = null, disabled = true)
        }

        // Daily rate limit (cost guard; per child, across all threads).
        val startOfDay = LocalDate.now(zone).atStartOfDay(zone).toInstant()
        val usedToday = chatMessageRepository.countByChildIdAndRoleAndCreatedAtAfter(childId, ChatRole.USER, startOfDay)
        if (usedToday >= settings.dailyLimit) {
            return ChatReply("", limited = true, threadId = threadId, threadTitle = null)
        }

        // Resolve (or create) the conversation. An unknown/foreign id → a fresh thread.
        val thread = threadId?.let { chatThreadRepository.findByIdAndChildId(it, childId) }
            ?: chatThreadRepository.save(ChatThread(childId = childId))

        chatMessageRepository.save(ChatMessage(childId = childId, threadId = thread.id, role = ChatRole.USER, content = text))

        val recentMsgs = chatMessageRepository
            .findByThreadIdOrderByCreatedAtDesc(thread.id, PageRequest.of(0, historyTurns * 2))
            .reversed()
            .map { LlmTurn(it.role, it.content) }
        // The image (not persisted) rides only on the current (last) user turn.
        val recent = if (image != null && recentMsgs.isNotEmpty())
            recentMsgs.dropLast(1) + recentMsgs.last().copy(imageBase64 = image, imageMediaType = imageMediaType)
        else recentMsgs

        val reply = try {
            engine.complete(SYSTEM_PROMPT, recent).ifBlank { FALLBACK }
        } catch (ex: Exception) {
            log.error("AI engine failed for child={} thread={}: {}", childId, thread.id, ex.message)
            FALLBACK
        }

        chatMessageRepository.save(ChatMessage(childId = childId, threadId = thread.id, role = ChatRole.ASSISTANT, content = reply.take(8000)))

        if (thread.title == null) thread.title = titleFrom(text)
        thread.updatedAt = Instant.now()
        chatThreadRepository.save(thread)

        return ChatReply(reply, limited = false, threadId = thread.id, threadTitle = thread.title)
    }

    @Transactional(readOnly = true)
    fun listThreads(childId: UUID): List<ChatThread> =
        chatThreadRepository.findByChildIdOrderByUpdatedAtDesc(childId)

    @Transactional(readOnly = true)
    fun threadHistory(childId: UUID, threadId: UUID): List<ChatMessage> {
        chatThreadRepository.findByIdAndChildId(threadId, childId) ?: return emptyList()
        return chatMessageRepository.findByThreadIdOrderByCreatedAtAsc(threadId)
    }

    private fun titleFrom(firstMessage: String): String {
        val clean = firstMessage.replace(Regex("\\s+"), " ").trim()
        return if (clean.length <= 48) clean else clean.take(47).trimEnd() + "…"
    }

    companion object {
        private const val FALLBACK = "Ой, я сейчас не могу ответить. Попробуй ещё раз чуть позже 🙏"

        private val SYSTEM_PROMPT = """
            You are "Кай" (Kai), a warm, patient AI study buddy living inside a children's
            finance app. You help children (roughly ages 7–16) with their homework and with
            questions about money. You speak Uzbek, Russian and English.

            GOLDEN RULE — never do the work for them:
            - Never give the final answer to a homework problem outright. Guide step by step:
              ask ONE small guiding question at a time, give a hint, and let the child reach
              the answer themselves. Confirm or reveal the answer only AFTER the child has
              tried the steps, or when they explicitly want to check an answer they already found.
            - If they just ask for "the answer", kindly invite them to take the next small step
              together instead.

            STYLE:
            - Reply in the SAME language the child writes in (Uzbek, Russian or English).
            - Keep messages short, warm and encouraging. Use simple words. Adapt to how young
              the child seems. An occasional emoji is nice. Praise effort; be gentle about mistakes.
            - You may use light Markdown (**bold**, *italic*, simple lists) to stay readable.

            MONEY & SAVING:
            - For money questions, give age-appropriate financial-literacy guidance (saving,
              needs vs wants, budgeting, earning by helping). Encourage good habits. Never give
              specific investment advice or talk about real trading.

            SAFETY (critical — you are talking to a child):
            - Refuse and gently redirect anything unsafe, adult, violent, hateful, scary or
              otherwise inappropriate.
            - For sensitive, medical, or personal-safety topics, kindly tell the child to talk
              to a parent or a trusted adult.
            - Never ask for personal data (full name, address, passwords, card numbers).
            - Don't claim to be human — you're a friendly helper. Don't make promises you can't keep.
            - Always stay age-appropriate, kind and positive.
        """.trimIndent()
    }
}
