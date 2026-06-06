package uz.kidscard.family.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "limit_rules", schema = "family")
class LimitRule(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "child_id", nullable = false)
    val childId: UUID,

    @Enumerated(EnumType.STRING)
    @Column(name = "limit_type", nullable = false)
    val limitType: LimitType,

    @Column(name = "category")
    val category: String? = null,

    @Column(name = "amount_uzs", nullable = false)
    var amountUzs: Long,

    @Column(name = "currency", nullable = false)
    val currency: String = "UZS",

    @Column(name = "active", nullable = false)
    var active: Boolean = true,

    @Column(name = "created_by", nullable = false)
    val createdBy: UUID,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),
)

// APPROVAL: not a spending cap — amount_uzs is the threshold above which a
// child's purchase needs parent approval (PC-05).
enum class LimitType { DAILY, WEEKLY, MONTHLY, CATEGORY, APPROVAL }
