package uz.kidscard.family.service

import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.family.domain.StudySession
import uz.kidscard.family.repository.StudySessionRepository
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

@Service
@Transactional
class StudySessionService(
    private val studySessionRepository: StudySessionRepository,
) {
    private val zone = ZoneId.of("Asia/Tashkent")

    /** Idempotently mark that this child studied today. At most one row per day. */
    fun recordToday(childId: UUID) {
        val today = LocalDate.now(zone)
        if (studySessionRepository.existsByChildIdAndStudyDate(childId, today)) return
        try {
            studySessionRepository.save(StudySession(childId = childId, studyDate = today))
        } catch (_: DataIntegrityViolationException) {
            // Lost a race with a concurrent request — the day is already recorded.
        }
    }
}
