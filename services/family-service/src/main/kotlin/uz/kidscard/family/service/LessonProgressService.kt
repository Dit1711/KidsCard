package uz.kidscard.family.service

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.family.api.dto.LessonProgressDto
import uz.kidscard.family.domain.LessonProgress
import uz.kidscard.family.repository.LessonProgressRepository
import java.util.UUID

@Service
@Transactional
class LessonProgressService(
    private val lessonProgressRepository: LessonProgressRepository,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Transactional(readOnly = true)
    fun getProgress(childId: UUID): LessonProgressDto {
        val rows = lessonProgressRepository.findByChildId(childId)
        return LessonProgressDto(
            totalStars = rows.sumOf { it.starsEarned },
            completedCount = rows.size,
            completedLessonIds = rows.map { it.lessonId },
        )
    }

    /**
     * Mark a lesson complete. Idempotent: replaying the same lesson never
     * awards stars twice — the first completion's stars stand.
     */
    fun complete(childId: UUID, lessonId: String, stars: Int, quizCorrect: Boolean): LessonProgressDto {
        val existing = lessonProgressRepository.findByChildIdAndLessonId(childId, lessonId)
        if (existing == null) {
            lessonProgressRepository.save(
                LessonProgress(
                    childId = childId,
                    lessonId = lessonId,
                    quizCorrect = quizCorrect,
                    starsEarned = stars.coerceAtLeast(0),
                ),
            )
            log.info("Lesson completed: child={} lesson={} stars={} correct={}", childId, lessonId, stars, quizCorrect)
        } else {
            log.debug("Lesson replay ignored: child={} lesson={}", childId, lessonId)
        }
        return getProgress(childId)
    }
}
