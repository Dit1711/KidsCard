package uz.kidscard.card.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.card.domain.AllowanceSchedule
import java.time.Instant
import java.util.UUID

interface AllowanceScheduleRepository : JpaRepository<AllowanceSchedule, UUID> {

    fun findByCardIdAndActiveTrue(cardId: UUID): List<AllowanceSchedule>

    fun findByNextRunAtBeforeAndActiveTrue(now: Instant): List<AllowanceSchedule>
}
