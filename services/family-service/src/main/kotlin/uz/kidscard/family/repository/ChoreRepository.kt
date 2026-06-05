package uz.kidscard.family.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.family.domain.Chore
import uz.kidscard.family.domain.ChoreStatus
import java.time.Instant
import java.util.UUID

interface ChoreRepository : JpaRepository<Chore, UUID> {

    fun findByFamilyId(familyId: UUID): List<Chore>

    /** Approved chores whose proof photo is older than the cutoff — for cleanup. */
    fun findByStatusAndProofPhotoKeyIsNotNullAndApprovedAtBefore(status: ChoreStatus, cutoff: Instant): List<Chore>

    fun findByFamilyIdAndChildId(familyId: UUID, childId: UUID): List<Chore>

    fun findByFamilyIdAndStatus(familyId: UUID, status: ChoreStatus): List<Chore>

    fun findByFamilyIdAndChildIdAndStatus(familyId: UUID, childId: UUID, status: ChoreStatus): List<Chore>

    fun findByChildIdOrderByCreatedAtDesc(childId: UUID): List<Chore>
}
