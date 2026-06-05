package uz.kidscard.ai.repository

import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.ai.domain.ChatMessage
import uz.kidscard.ai.domain.ChatRole
import java.time.Instant
import java.util.UUID

interface ChatMessageRepository : JpaRepository<ChatMessage, UUID> {

    /** Recent messages in a thread for context (newest first; caller reverses + limits). */
    fun findByThreadIdOrderByCreatedAtDesc(threadId: UUID, pageable: Pageable): List<ChatMessage>

    /** Full thread history, oldest-first. */
    fun findByThreadIdOrderByCreatedAtAsc(threadId: UUID): List<ChatMessage>

    /** Daily rate-limit counter (per child, across all threads). */
    fun countByChildIdAndRoleAndCreatedAtAfter(childId: UUID, role: ChatRole, after: Instant): Long
}
