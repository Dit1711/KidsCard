package uz.kidscard.family.api.dto

import uz.kidscard.family.domain.Child
import uz.kidscard.family.domain.Chore
import uz.kidscard.family.domain.Family
import uz.kidscard.family.domain.LimitRule
import uz.kidscard.family.domain.MoneyRequest
import uz.kidscard.family.domain.Parent
import uz.kidscard.family.domain.SavingsGoal
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

data class FamilyDto(
    val id: UUID,
    val name: String,
    val status: String,
    val parents: List<ParentDto>,
    val createdAt: Instant,
)

data class ParentDto(
    val id: UUID,
    val userId: UUID,
    val role: String,
    val fullName: String,
    val phone: String,
    val kycStatus: String,
)

data class ChildDto(
    val id: UUID,
    val familyId: UUID,
    val fullName: String,
    val dateOfBirth: LocalDate,
    val ageGroup: String,
    val avatarUrl: String?,
    val status: String,
)

data class LimitRuleDto(
    val id: UUID,
    val childId: UUID,
    val limitType: String,
    val category: String?,
    val amountUzs: Long,
    val currency: String,
    val active: Boolean,
)

data class ChoreDto(
    val id: UUID,
    val familyId: UUID,
    val childId: UUID,
    val title: String,
    val rewardAmount: Long,
    val status: String,
    val recurrence: String,
    val dueDate: LocalDate?,
    val completedAt: Instant?,
    val approvedAt: Instant?,
)

data class SavingsGoalDto(
    val id: UUID,
    val childId: UUID,
    val title: String,
    val description: String?,
    val targetAmount: Long,
    val currentAmount: Long,
    val interestEarned: Long,
    val currency: String,
    val deadline: LocalDate?,
    val status: String,
    val imageUrl: String?,
)

data class LessonProgressDto(
    val totalStars: Int,
    val completedCount: Int,
    val completedLessonIds: List<String>,
)

/** Gamification snapshot for the teen kid cabinet — all values derived at read time. */
data class GamificationDto(
    val xp: Int,
    val level: Int,
    val title: String,        // level title, e.g. "Инвестор"
    val xpIntoLevel: Int,     // XP earned within the current level
    val xpForNext: Int,       // XP needed to clear the current level
    val streakDays: Int,      // consecutive active days ending today/yesterday
    val longestStreak: Int,
    val activeToday: Boolean, // did something XP-worthy today
    val league: String,       // BRONZE / SILVER / GOLD / PLATINUM
    val badges: List<BadgeDto>,
)

data class BadgeDto(
    val key: String,
    val title: String,
    val description: String,
    val earned: Boolean,
    val earnedAt: Instant?,
)

data class MoneyRequestDto(
    val id: UUID,
    val familyId: UUID,
    val childId: UUID,
    val type: String,
    val amountUzs: Long,
    val cardId: UUID?,
    val limitType: String?,
    val category: String?,
    val note: String?,
    val status: String,
    val createdAt: Instant,
    val resolvedAt: Instant?,
)

// Extension mapping functions
fun Family.toDto() = FamilyDto(
    id = id,
    name = name,
    status = status.name,
    parents = parents.map { it.toDto() },
    createdAt = createdAt,
)

fun Parent.toDto() = ParentDto(
    id = id,
    userId = userId,
    role = role.name,
    fullName = fullName,
    phone = phone,
    kycStatus = kycStatus.name,
)

fun Child.toDto() = ChildDto(
    id = id,
    familyId = family.id,
    fullName = fullName,
    dateOfBirth = dateOfBirth,
    ageGroup = ageGroup.name,
    avatarUrl = avatarUrl,
    status = status.name,
)

fun LimitRule.toDto() = LimitRuleDto(
    id = id,
    childId = childId,
    limitType = limitType.name,
    category = category,
    amountUzs = amountUzs,
    currency = currency,
    active = active,
)

fun Chore.toDto() = ChoreDto(
    id = id,
    familyId = familyId,
    childId = childId,
    title = title,
    rewardAmount = rewardAmount,
    status = status.name,
    recurrence = recurrence.name,
    dueDate = dueDate,
    completedAt = completedAt,
    approvedAt = approvedAt,
)

fun SavingsGoal.toDto() = SavingsGoalDto(
    id = id,
    childId = childId,
    title = title,
    description = description,
    targetAmount = targetAmount,
    currentAmount = currentAmount,
    interestEarned = interestEarned,
    currency = currency,
    deadline = deadline,
    status = status.name,
    imageUrl = imageUrl,
)

fun MoneyRequest.toDto() = MoneyRequestDto(
    id = id,
    familyId = familyId,
    childId = childId,
    type = type.name,
    amountUzs = amountUzs,
    cardId = cardId,
    limitType = limitType,
    category = category,
    note = note,
    status = status.name,
    createdAt = createdAt,
    resolvedAt = resolvedAt,
)
