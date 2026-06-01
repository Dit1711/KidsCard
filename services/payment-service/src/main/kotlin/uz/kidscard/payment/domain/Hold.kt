package uz.kidscard.payment.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

enum class HoldStatus { HELD, CAPTURED, RELEASED }

@Entity
@Table(name = "holds", schema = "payment")
class Hold(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "family_id", nullable = false)
    val familyId: UUID,

    @Column(name = "reference", nullable = false, unique = true)
    val reference: String,

    @Column(name = "amount_uzs", nullable = false)
    val amountUzs: Long,

    @Column(name = "status", nullable = false)
    var status: String = HoldStatus.HELD.name,

    @Column(name = "captured_to_card")
    var capturedToCard: UUID? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),
)
