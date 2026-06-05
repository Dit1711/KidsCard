package uz.kidscard.ai.repository

import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.ai.domain.ChatMessage
import uz.kidscard.ai.domain.ChatRole
import java.time.Instant
import java.util.UUID

interface ChatMessageRepository : JpaRepository<ChatMessage, UUID> {

    /** Recent messages for context (newest first; caller reverses + limits). */
    fun findByChildIdOrderByCreatedAtDesc(childId: UUID, pageable: Pageable): List<ChatMessage>

    /** Full history oldest-first (parent view). */
    fun findByChildIdOrderByCreatedAtAsc(childId: UUID): List<ChatMessage>

    /** Daily rate-limit counter. */
    fun countByChildIdAndRoleAndCreatedAtAfter(childId: UUID, role: ChatRole, after: Instant): Long
}
