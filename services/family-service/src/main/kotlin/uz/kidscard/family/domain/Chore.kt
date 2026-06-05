package uz.kidscard.family.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

@Entity
@Table(name = "chores", schema = "family")
class Chore(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "family_id", nullable = false)
    val familyId: UUID,

    @Column(name = "child_id", nullable = false)
    val childId: UUID,

    @Column(name = "title", nullable = false)
    var title: String,

    @Column(name = "description")
    var description: String? = null,

    @Column(name = "reward_amount", nullable = false)
    var rewardAmount: Long = 0,

    @Column(name = "due_date")
    var dueDate: LocalDate? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "recurrence")
    var recurrence: Recurrence = Recurrence.NONE,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    var status: ChoreStatus = ChoreStatus.PENDING,

    @Column(name = "completed_at")
    var completedAt: Instant? = null,

    @Column(name = "approved_by")
    var approvedBy: UUID? = null,

    @Column(name = "approved_at")
    var approvedAt: Instant? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),

    /** If true, the child must attach a photo when marking the chore done. */
    @Column(name = "requires_photo", nullable = false)
    var requiresPhoto: Boolean = false,

    /** Storage key of the proof photo (null until uploaded / after cleanup). */
    @Column(name = "proof_photo_key")
    var proofPhotoKey: String? = null,

    /** When the proof photo was uploaded — drives the 30-day cleanup. */
    @Column(name = "proof_photo_at")
    var proofPhotoAt: Instant? = null,
)

enum class Recurrence { NONE, DAILY, WEEKLY }
enum class ChoreStatus { PENDING, DONE, APPROVED, REJECTED }
