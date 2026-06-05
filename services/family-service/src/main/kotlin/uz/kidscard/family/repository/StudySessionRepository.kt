package uz.kidscard.family.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.family.domain.StudySession
import java.time.LocalDate
import java.util.UUID

interface StudySessionRepository : JpaRepository<StudySession, UUID> {

    fun findByChildId(childId: UUID): List<StudySession>

    fun existsByChildIdAndStudyDate(childId: UUID, studyDate: LocalDate): Boolean
}
