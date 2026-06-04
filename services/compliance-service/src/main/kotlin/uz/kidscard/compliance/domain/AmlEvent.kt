package uz.kidscard.compliance.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/**
 * A minimal projection of a money movement, kept so the AML engine can evaluate
 * windowed rules (velocity, structuring, daily totals) with cheap SQL aggregates
 * instead of re-parsing the audit log's JSON.
 */
@Entity
@Table(name = "aml_event", schema = "compliance")
class AmlEvent(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "family_id")
    val familyId: UUID? = null,

    @Column(name = "child_id")
    val childId: UUID? = null,

    @Column(name = "card_id")
    val cardId: UUID? = null,

    @Column(name = "amount_uzs", nullable = false)
    val amountUzs: Long,

    @Column(name = "direction", nullable = false)
    val direction: String,

    @Column(name = "type")
    val type: String? = null,

    @Column(name = "occurred_at", nullable = false)
    val occurredAt: Instant = Instant.now(),
)
