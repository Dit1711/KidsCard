package uz.kidscard.family.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/**
 * One paid-out savings-match bonus. Kept as an audit trail and as the source of
 * truth for the per-month cap (sum this calendar month vs the rule's cap).
 */
@Entity
@Table(name = "match_awards", schema = "family")
class MatchAward(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "child_id", nullable = false)
    val childId: UUID,

    @Column(name = "goal_id", nullable = false)
    val goalId: UUID,

    @Column(name = "amount_uzs", nullable = false)
    val amountUzs: Long,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),
)
