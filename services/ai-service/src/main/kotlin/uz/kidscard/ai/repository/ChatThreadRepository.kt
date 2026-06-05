package uz.kidscard.ai.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.ai.domain.ChatThread
import java.util.UUID

interface ChatThreadRepository : JpaRepository<ChatThread, UUID> {

    /** A child's conversations, most recently used first. */
    fun findByChildIdOrderByUpdatedAtDesc(childId: UUID): List<ChatThread>

    /** A specific thread, scoped to its owner (authorization). */
    fun findByIdAndChildId(id: UUID, childId: UUID): ChatThread?
}
