package uz.kidscard.family.repository

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import uz.kidscard.family.domain.MatchAward
import java.time.Instant
import java.util.UUID

interface MatchAwardRepository : JpaRepository<MatchAward, UUID> {

    /** Total match paid to a child since [since] (used for the monthly cap). */
    @Query("SELECT COALESCE(SUM(a.amountUzs), 0) FROM MatchAward a WHERE a.childId = :childId AND a.createdAt >= :since")
    fun sumSince(@Param("childId") childId: UUID, @Param("since") since: Instant): Long
}
