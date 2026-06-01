package uz.kidscard.family.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.family.domain.GoalStatus
import uz.kidscard.family.domain.SavingsGoal
import java.util.UUID

interface SavingsGoalRepository : JpaRepository<SavingsGoal, UUID> {

    fun findByChildIdAndStatus(childId: UUID, status: GoalStatus): List<SavingsGoal>

    fun findByChildIdOrderByCreatedAtDesc(childId: UUID): List<SavingsGoal>
}
