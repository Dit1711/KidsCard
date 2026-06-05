package uz.kidscard.family.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.family.domain.ChildLocation
import java.time.Instant
import java.util.UUID

interface ChildLocationRepository : JpaRepository<ChildLocation, UUID> {

    /** Recent pings for a child (newest first). */
    fun findByChildIdAndCapturedAtAfterOrderByCapturedAtDesc(childId: UUID, since: Instant): List<ChildLocation>

    /** The single most recent ping (last known place). */
    fun findTopByChildIdOrderByCapturedAtDesc(childId: UUID): ChildLocation?

    /** Old pings to purge (privacy retention). */
    fun deleteByCapturedAtBefore(cutoff: Instant): Long
}
