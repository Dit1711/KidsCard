package uz.kidscard.family.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.family.domain.LocationRequest
import uz.kidscard.family.domain.LocationRequestStatus
import java.util.UUID

interface LocationRequestRepository : JpaRepository<LocationRequest, UUID> {

    /** The child's newest request in a given status (e.g. the pending one). */
    fun findTopByChildIdAndStatusOrderByCreatedAtDesc(
        childId: UUID,
        status: LocationRequestStatus,
    ): LocationRequest?
}
