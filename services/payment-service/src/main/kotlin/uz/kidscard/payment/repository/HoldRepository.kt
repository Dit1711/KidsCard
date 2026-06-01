package uz.kidscard.payment.repository

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import uz.kidscard.payment.domain.Hold
import java.util.Optional
import java.util.UUID

interface HoldRepository : JpaRepository<Hold, UUID> {

    fun findByReference(reference: String): Optional<Hold>

    @Query(
        """
        SELECT COALESCE(SUM(h.amountUzs), 0) FROM Hold h
        WHERE h.familyId = :familyId AND h.status = 'HELD'
        """
    )
    fun sumHeld(@Param("familyId") familyId: UUID): Long
}
