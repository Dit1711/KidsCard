package uz.kidscard.compliance.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant
import java.util.UUID

/**
 * One immutable entry in the append-only audit trail. Each entry carries a
 * SHA-256 [entryHash] over its own content plus the previous entry's hash
 * ([prevHash]) — a tamper-evident chain: editing or removing any past entry
 * breaks every hash after it. DB-level triggers additionally block UPDATE/DELETE
 * (see V1 migration), so the table is genuinely append-only.
 */
@Entity
@Table(name = "audit_log", schema = "compliance")
class AuditLog(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    // DB-generated monotonic sequence (BIGINT IDENTITY); read-only for the ORM.
    @Column(name = "seq", insertable = false, updatable = false)
    val seq: Long? = null,

    @Column(name = "event_type", nullable = false)
    val eventType: String,

    @Column(name = "topic", nullable = false)
    val topic: String,

    @Column(name = "aggregate_id")
    val aggregateId: UUID? = null,

    @Column(name = "family_id")
    val familyId: UUID? = null,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", columnDefinition = "jsonb")
    val payload: String? = null,

    @Column(name = "prev_hash", nullable = false)
    val prevHash: String,

    @Column(name = "entry_hash", nullable = false)
    val entryHash: String,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),
)
