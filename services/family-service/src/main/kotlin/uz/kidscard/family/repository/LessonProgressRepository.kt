package uz.kidscard.family.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.family.domain.LessonProgress
import java.util.UUID

interface LessonProgressRepository : JpaRepository<LessonProgress, UUID> {

    fun findByChildId(childId: UUID): List<LessonProgress>

    fun findByChildIdAndLessonId(childId: UUID, lessonId: String): LessonProgress?
}
