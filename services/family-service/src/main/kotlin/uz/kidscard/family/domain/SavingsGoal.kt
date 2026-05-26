package uz.kidscard.family.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.Version
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

@Entity
@Table(name = "savings_goals", schema = "family")
class SavingsGoal(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "child_id", nullable = false)
    val childId: UUID,

    @Column(name = "title", nullable = false)
    var title: String,

    @Column(name = "description")
    var description: String? = null,

    @Column(name = "target_amount", nullable = false)
    var targetAmount: Long,

    @Column(name = "current_amount", nullable = false)
    var currentAmount: Long = 0,

    @Column(name = "currency", nullable = false)
    val currency: String = "UZS",

    @Column(name = "deadline")
    var deadline: LocalDate? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    var status: GoalStatus = GoalStatus.ACTIVE,

    @Column(name = "image_url")
    var imageUrl: String? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),

    @Version
    @Column(name = "version", nullable = false)
    var version: Long = 0,
)

enum class GoalStatus { ACTIVE, COMPLETED, CANCELLED }
