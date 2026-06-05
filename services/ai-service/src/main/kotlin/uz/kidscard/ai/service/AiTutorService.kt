package uz.kidscard.ai.service

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.ai.domain.ChatMessage
import uz.kidscard.ai.domain.ChatRole
import uz.kidscard.ai.repository.ChatMessageRepository
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

/** Result of one tutor turn. `limited` = the child hit today's message cap. */
data class ChatReply(val reply: String, val limited: Boolean)

@Service
@Transactional
class AiTutorService(
    private val chatMessageRepository: ChatMessageRepository,
    private val engine: LlmEngine,
    @Value("\${app.ai.daily-message-limit}") private val dailyLimit: Int,
    @Value("\${app.ai.history-turns}") private val historyTurns: Int,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val zone = ZoneId.of("Asia/Tashkent")

    fun chat(childId: UUID, userText: String): ChatReply {
        val text = userText.trim().take(4000)
        if (text.isBlank()) return ChatReply("", limited = false)

        // Daily rate limit (cost guard; parent-configurable later).
        val startOfDay = LocalDate.now(zone).atStartOfDay(zone).toInstant()
        val usedToday = chatMessageRepository.countByChildIdAndRoleAndCreatedAtAfter(childId, ChatRole.USER, startOfDay)
        if (usedToday >= dailyLimit) {
            return ChatReply("", limited = true)
        }

        chatMessageRepository.save(ChatMessage(childId = childId, role = ChatRole.USER, content = text))

        // Recent context (oldest→newest), ending with this just-saved user message.
        val recent = chatMessageRepository
            .findByChildIdOrderByCreatedAtDesc(childId, PageRequest.of(0, historyTurns * 2))
            .reversed()
            .map { LlmTurn(it.role, it.content) }

        val reply = try {
            engine.complete(SYSTEM_PROMPT, recent).ifBlank { FALLBACK }
        } catch (ex: Exception) {
            log.error("AI engine failed for child={}: {}", childId, ex.message)
            FALLBACK
        }

        chatMessageRepository.save(ChatMessage(childId = childId, role = ChatRole.ASSISTANT, content = reply.take(8000)))
        return ChatReply(reply, limited = false)
    }

    @Transactional(readOnly = true)
    fun history(childId: UUID): List<ChatMessage> =
        chatMessageRepository.findByChildIdOrderByCreatedAtAsc(childId)

    companion object {
        private const val FALLBACK = "Ой, я сейчас не могу ответить. Попробуй ещё раз чуть позже 🙏"

        /**
         * The tutor's persona + guardrails. This prompt IS the product — Socratic
         * help (hints, not answers), child-safe, multilingual (uz/ru/en).
         */
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
