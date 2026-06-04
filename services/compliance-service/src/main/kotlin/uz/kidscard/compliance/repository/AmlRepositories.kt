package uz.kidscard.compliance.repository

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import uz.kidscard.compliance.domain.AmlAlert
import uz.kidscard.compliance.domain.AmlEvent
import java.time.Instant
import java.util.UUID

interface AmlEventRepository : JpaRepository<AmlEvent, UUID> {

    /** Velocity: how many movements for this child since [since]. */
    fun countByChildIdAndOccurredAtAfter(childId: UUID, since: Instant): Long

    /** Structuring: movements just under a threshold (amount in [lo, hi]) in a window. */
    fun countByChildIdAndDirectionAndOccurredAtAfterAndAmountUzsBetween(
        childId: UUID,
        direction: String,
        since: Instant,
        lo: Long,
        hi: Long,
    ): Long

    @Query(
        "SELECT COALESCE(SUM(e.amountUzs), 0) FROM AmlEvent e " +
            "WHERE e.childId = :childId AND e.direction = :direction AND e.occurredAt > :since",
    )
    fun sumSince(
        @Param("childId") childId: UUID,
        @Param("direction") direction: String,
        @Param("since") since: Instant,
    ): Long
}

interface AmlAlertRepository : JpaRepository<AmlAlert, UUID> {

    fun findAllByOrderByCreatedAtDesc(pageable: Pageable): Page<AmlAlert>

    fun findByStatusOrderByCreatedAtDesc(status: String, pageable: Pageable): Page<AmlAlert>

    /** Dedup: is there already a recent alert of this rule for this child? */
    fun existsByChildIdAndRuleCodeAndCreatedAtAfter(childId: UUID, ruleCode: String, since: Instant): Boolean
}
