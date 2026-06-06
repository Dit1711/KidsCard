package uz.kidscard.family.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/**
 * Parent "savings match": for every UZS the child puts into a goal, the parent
 * adds [percent]% on top, funded from the family wallet. One rule per child,
 * applies to all the child's goals. [percent] = 0 disables it. [monthlyCapUzs]
 * (null = no cap) bounds how much match is paid out per calendar month.
 */
@Entity
@Table(name = "savings_match_rules", schema = "family")
class SavingsMatchRule(
    @Id
    @Column(name = "child_id", updatable = false, nullable = false)
    val childId: UUID,

    @Column(name = "percent", nullable = false)
    var percent: Int = 0,

    @Column(name = "monthly_cap_uzs")
    var monthlyCapUzs: Long? = null,

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),
)
