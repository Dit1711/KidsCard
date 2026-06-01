package uz.kidscard.family.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

enum class RequestType { TOPUP, LIMIT }
enum class RequestStatus { PENDING, APPROVED, DECLINED }

/** A child's request to a parent for money (card top-up) or a limit increase. */
@Entity
@Table(name = "money_requests", schema = "family")
class MoneyRequest(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "family_id", nullable = false)
    val familyId: UUID,

    @Column(name = "child_id", nullable = false)
    val childId: UUID,

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    val type: RequestType,

    @Column(name = "amount_uzs", nullable = false)
    val amountUzs: Long,

    @Column(name = "card_id")
    val cardId: UUID? = null,

    @Column(name = "limit_type")
    val limitType: String? = null,

    @Column(name = "category")
    val category: String? = null,

    @Column(name = "note")
    val note: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    var status: RequestStatus = RequestStatus.PENDING,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "resolved_at")
    var resolvedAt: Instant? = null,

    @Column(name = "resolved_by")
    var resolvedBy: UUID? = null,
)
