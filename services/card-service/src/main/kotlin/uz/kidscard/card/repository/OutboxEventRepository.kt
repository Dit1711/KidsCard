package uz.kidscard.card.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.common.outbox.OutboxEvent
import uz.kidscard.common.outbox.OutboxStatus
import java.util.UUID

interface OutboxEventRepository : JpaRepository<OutboxEvent, UUID> {

    fun findTop50ByStatusOrderByCreatedAt(status: OutboxStatus): List<OutboxEvent>
}
