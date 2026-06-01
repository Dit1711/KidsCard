package uz.kidscard.family.service

import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.common.exception.BusinessException
import uz.kidscard.common.exception.ResourceNotFoundException
import uz.kidscard.family.api.dto.SavingsGoalDto
import uz.kidscard.family.api.dto.toDto
import uz.kidscard.family.domain.GoalStatus
import uz.kidscard.family.domain.SavingsGoal
import uz.kidscard.family.repository.SavingsGoalRepository
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

@Service
@Transactional
class SavingsGoalService(
    private val savingsGoalRepository: SavingsGoalRepository,
    private val savingsClient: SavingsClient,
    private val childRepository: uz.kidscard.family.repository.ChildRepository,
    private val familyService: FamilyService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    /** Parent view: all goals across the family's children. */
    @Transactional(readOnly = true)
    fun getFamilyGoals(familyId: UUID, requestingUserId: UUID): List<SavingsGoalDto> {
        familyService.requireMember(familyId, requestingUserId)
        return childRepository.findByFamilyId(familyId)
            .flatMap { savingsGoalRepository.findByChildIdOrderByCreatedAtDesc(it.id) }
            .map { it.toDto() }
    }

    /** Parent gift from the family wallet to a child's goal. */
    fun contribute(goalId: UUID, familyId: UUID, requestingUserId: UUID, amountUzs: Long, token: String): SavingsGoalDto {
        familyService.requireOwner(familyId, requestingUserId)
        val goal = savingsGoalRepository.findById(goalId).orElseThrow {
            ResourceNotFoundException("SavingsGoal", goalId)
        }
        // Confirm the goal's child belongs to this family.
        childRepository.findByFamilyIdAndId(familyId, goal.childId)
            ?: throw ResourceNotFoundException("SavingsGoal", goalId)

        savingsClient.contribute(familyId, goal.childId, goalId, amountUzs, token)
        goal.currentAmount += amountUzs
        if (goal.currentAmount >= goal.targetAmount) goal.status = GoalStatus.COMPLETED
        goal.updatedAt = Instant.now()
        log.info("Parent contributed: goal={} +{} → {}/{}", goalId, amountUzs, goal.currentAmount, goal.targetAmount)
        return savingsGoalRepository.save(goal).toDto()
    }

    fun createGoal(
        childId: UUID,
        title: String,
        targetAmount: Long,
        deadline: LocalDate?,
        imageUrl: String?,
    ): SavingsGoalDto {
        if (targetAmount <= 0) throw BusinessException("INVALID_TARGET", "Цель должна быть больше нуля")
        val goal = SavingsGoal(
            childId = childId,
            title = title,
            targetAmount = targetAmount,
            deadline = deadline,
            imageUrl = imageUrl,
        )
        return savingsGoalRepository.save(goal).toDto()
    }

    @Transactional(readOnly = true)
    fun getGoals(childId: UUID): List<SavingsGoalDto> =
        savingsGoalRepository.findByChildIdOrderByCreatedAtDesc(childId).map { it.toDto() }

    fun deposit(goalId: UUID, childId: UUID, familyId: UUID, cardId: UUID, amountUzs: Long, token: String): SavingsGoalDto {
        val goal = requireOwnGoal(goalId, childId)
        savingsClient.deposit(cardId, childId, familyId, goalId, amountUzs, token)
        goal.currentAmount += amountUzs
        if (goal.currentAmount >= goal.targetAmount) goal.status = GoalStatus.COMPLETED
        goal.updatedAt = Instant.now()
        log.info("Savings deposit: goal={} +{} → {}/{}", goalId, amountUzs, goal.currentAmount, goal.targetAmount)
        return savingsGoalRepository.save(goal).toDto()
    }

    fun withdraw(goalId: UUID, childId: UUID, familyId: UUID, cardId: UUID, amountUzs: Long, token: String): SavingsGoalDto {
        val goal = requireOwnGoal(goalId, childId)
        if (amountUzs > goal.currentAmount) {
            throw BusinessException("INSUFFICIENT_SAVINGS", "В копилке меньше денег", HttpStatus.UNPROCESSABLE_ENTITY)
        }
        savingsClient.withdraw(cardId, childId, familyId, goalId, amountUzs, token)
        goal.currentAmount -= amountUzs
        if (goal.status == GoalStatus.COMPLETED && goal.currentAmount < goal.targetAmount) {
            goal.status = GoalStatus.ACTIVE
        }
        goal.updatedAt = Instant.now()
        return savingsGoalRepository.save(goal).toDto()
    }

    private fun requireOwnGoal(goalId: UUID, childId: UUID): SavingsGoal {
        val goal = savingsGoalRepository.findById(goalId).orElseThrow {
            ResourceNotFoundException("SavingsGoal", goalId)
        }
        if (goal.childId != childId) throw ResourceNotFoundException("SavingsGoal", goalId)
        return goal
    }
}
