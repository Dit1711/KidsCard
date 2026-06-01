package uz.kidscard.family.service

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.common.exception.ResourceNotFoundException
import uz.kidscard.family.api.dto.BadgeDto
import uz.kidscard.family.api.dto.GamificationDto
import uz.kidscard.family.domain.ChoreStatus
import uz.kidscard.family.domain.GoalStatus
import uz.kidscard.family.repository.ChildRepository
import uz.kidscard.family.repository.ChoreRepository
import uz.kidscard.family.repository.LessonProgressRepository
import uz.kidscard.family.repository.SavingsGoalRepository
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

/**
 * Read-time gamification engine for the teen kid cabinet.
 *
 * Every value is DERIVED from records the app already persists (approved chores,
 * completed lessons, completed savings goals). Nothing is stored or mutated here,
 * so XP can never be double-awarded and there is no write-path to keep in sync.
 */
@Service
@Transactional(readOnly = true)
class GamificationService(
    private val choreRepository: ChoreRepository,
    private val lessonProgressRepository: LessonProgressRepository,
    private val savingsGoalRepository: SavingsGoalRepository,
    private val childRepository: ChildRepository,
    private val familyService: FamilyService,
) {
    private val zone = ZoneId.of("Asia/Tashkent")

    companion object {
        const val XP_PER_CHORE = 50
        const val XP_PER_LESSON_BASE = 40
        const val XP_PER_GOAL = 200
        const val XP_PER_LEVEL = 400

        // Level titles by tier (every 5 levels). Reused, teen-appropriate.
        private val LEVEL_TITLES = listOf(
            "Новичок", "Копитель", "Стратег", "Инвестор", "Магнат",
        )
    }

    /** Parent view: verify the requester is in the family and the child belongs to it. */
    fun snapshotForParent(familyId: UUID, childId: UUID, requestingUserId: UUID): GamificationDto {
        familyService.requireMember(familyId, requestingUserId)
        childRepository.findByFamilyIdAndId(familyId, childId)
            ?: throw ResourceNotFoundException("Child", childId)
        return snapshot(childId)
    }

    fun snapshot(childId: UUID): GamificationDto {
        val approvedChores = choreRepository.findByChildIdOrderByCreatedAtDesc(childId)
            .filter { it.status == ChoreStatus.APPROVED }
        val lessons = lessonProgressRepository.findByChildId(childId)
        val goals = savingsGoalRepository.findByChildIdOrderByCreatedAtDesc(childId)
        val completedGoals = goals.filter { it.status == GoalStatus.COMPLETED }

        // ---- XP ----
        val choreXp = approvedChores.size * XP_PER_CHORE
        val lessonXp = lessons.sumOf { XP_PER_LESSON_BASE + it.starsEarned }
        val goalXp = completedGoals.size * XP_PER_GOAL
        val xp = choreXp + lessonXp + goalXp

        val level = xp / XP_PER_LEVEL + 1
        val xpIntoLevel = xp % XP_PER_LEVEL
        val title = LEVEL_TITLES[((level - 1) / 5).coerceIn(0, LEVEL_TITLES.size - 1)]

        // ---- Streak (consecutive active days, ending today or yesterday) ----
        val activityDays: Set<LocalDate> = buildSet {
            approvedChores.forEach { c -> (c.approvedAt ?: c.completedAt)?.let { add(it.toLocalDate()) } }
            lessons.forEach { add(it.completedAt.toLocalDate()) }
        }
        val today = LocalDate.now(zone)
        val activeToday = activityDays.contains(today)
        val streakDays = currentStreak(activityDays, today)
        val longestStreak = longestStreak(activityDays)

        // ---- League tier (by XP) ----
        val league = when {
            xp >= 8000 -> "PLATINUM"
            xp >= 4000 -> "GOLD"
            xp >= 1500 -> "SILVER"
            else -> "BRONZE"
        }

        // ---- Badges (threshold-based, earnedAt = when the threshold was crossed) ----
        val totalSaved = goals.sumOf { it.currentAmount }
        val badges = listOf(
            badge("first_chore", "Первое задание", "Выполни первое задание",
                approvedChores.size >= 1, nthChoreInstant(approvedChores, 1)),
            badge("chore_10", "Трудяга", "Выполни 10 заданий",
                approvedChores.size >= 10, nthChoreInstant(approvedChores, 10)),
            badge("first_lesson", "Финансовая грамотность", "Пройди первый урок",
                lessons.isNotEmpty(), lessons.minByOrNull { it.completedAt }?.completedAt),
            badge("lesson_5", "Отличник", "Пройди 5 уроков",
                lessons.size >= 5, nthLessonInstant(lessons, 5)),
            badge("first_goal", "Мечта сбылась", "Достигни первой цели",
                completedGoals.isNotEmpty(), completedGoals.minByOrNull { it.updatedAt }?.updatedAt),
            badge("streak_7", "На волне", "7 дней активности подряд",
                longestStreak >= 7, null),
            badge("saver_1m", "Миллион не предел", "Накопи 1 000 000 в целях",
                totalSaved >= 1_000_000, null),
        )

        return GamificationDto(
            xp = xp,
            level = level,
            title = title,
            xpIntoLevel = xpIntoLevel,
            xpForNext = XP_PER_LEVEL,
            streakDays = streakDays,
            longestStreak = longestStreak,
            activeToday = activeToday,
            league = league,
            badges = badges,
        )
    }

    private fun Instant.toLocalDate(): LocalDate = atZone(zone).toLocalDate()

    /** Streak counting back from today; unbroken if last activity was today or yesterday. */
    private fun currentStreak(days: Set<LocalDate>, today: LocalDate): Int {
        if (days.isEmpty()) return 0
        var cursor = when {
            days.contains(today) -> today
            days.contains(today.minusDays(1)) -> today.minusDays(1)
            else -> return 0
        }
        var streak = 0
        while (days.contains(cursor)) {
            streak++
            cursor = cursor.minusDays(1)
        }
        return streak
    }

    private fun longestStreak(days: Set<LocalDate>): Int {
        if (days.isEmpty()) return 0
        val sorted = days.sorted()
        var longest = 1
        var run = 1
        for (i in 1 until sorted.size) {
            run = if (sorted[i] == sorted[i - 1].plusDays(1)) run + 1 else 1
            if (run > longest) longest = run
        }
        return longest
    }

    private fun nthChoreInstant(chores: List<uz.kidscard.family.domain.Chore>, n: Int): Instant? {
        if (chores.size < n) return null
        return chores.mapNotNull { it.approvedAt ?: it.completedAt }.sorted().getOrNull(n - 1)
    }

    private fun nthLessonInstant(lessons: List<uz.kidscard.family.domain.LessonProgress>, n: Int): Instant? {
        if (lessons.size < n) return null
        return lessons.map { it.completedAt }.sorted().getOrNull(n - 1)
    }

    private fun badge(key: String, title: String, description: String, earned: Boolean, earnedAt: Instant?) =
        BadgeDto(key, title, description, earned, if (earned) earnedAt else null)
}
