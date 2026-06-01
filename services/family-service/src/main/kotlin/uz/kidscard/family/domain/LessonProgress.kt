package uz.kidscard.family.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/**
 * One row per (child, lesson) once the child completes a financial-literacy
 * lesson. Lesson content is editorial and lives in the web app; we only persist
 * the completion, quiz outcome and stars (XP) earned.
 */
@Entity
@Table(name = "lesson_progress", schema = "family")
class LessonProgress(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "child_id", nullable = false)
    val childId: UUID,

    @Column(name = "lesson_id", nullable = false)
    val lessonId: String,

    @Column(name = "quiz_correct", nullable = false)
    var quizCorrect: Boolean = false,

    @Column(name = "stars_earned", nullable = false)
    var starsEarned: Int = 0,

    @Column(name = "completed_at", nullable = false, updatable = false)
    val completedAt: Instant = Instant.now(),
)
