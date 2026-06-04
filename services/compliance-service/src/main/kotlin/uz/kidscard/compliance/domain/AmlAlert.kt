package uz.kidscard.compliance.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

enum class AmlSeverity { LOW, MEDIUM, HIGH }

/** Lifecycle of an alert in the compliance queue. */
enum class AmlAlertStatus { OPEN, REVIEWING, CLEARED, ESCALATED }

@Entity
@Table(name = "aml_alert", schema = "compliance")
class AmlAlert(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "family_id")
    val familyId: UUID? = null,

    @Column(name = "child_id")
    val childId: UUID? = null,

    @Column(name = "rule_code", nullable = false)
    val ruleCode: String,

    @Column(name = "severity", nullable = false)
    val severity: String,

    @Column(name = "title", nullable = false)
    val title: String,

    @Column(name = "detail", nullable = false)
    val detail: String,

    @Column(name = "amount_uzs")
    val amountUzs: Long? = null,

    @Column(name = "status", nullable = false)
    var status: String = AmlAlertStatus.OPEN.name,

    @Column(name = "resolved_by")
    var resolvedBy: UUID? = null,

    @Column(name = "resolution_note")
    var resolutionNote: String? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),
)
