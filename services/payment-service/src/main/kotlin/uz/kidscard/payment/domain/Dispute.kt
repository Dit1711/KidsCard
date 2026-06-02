package uz.kidscard.payment.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/** Why a parent is disputing a transaction. */
enum class DisputeReason {
    UNRECOGNIZED,   // не узнаю эту покупку
    WRONG_AMOUNT,   // списана неверная сумма
    NOT_RECEIVED,   // товар/услуга не получены
    DUPLICATE,      // двойное списание
    OTHER,
}

enum class DisputeStatus {
    OPEN,           // подана, ждёт рассмотрения
    UNDER_REVIEW,   // на рассмотрении (саппорт/комплаенс)
    RESOLVED,       // решена в пользу клиента (возврат)
    REJECTED,       // отклонена / отозвана
}

/** A parent's dispute against a transaction on their child's card. */
@Entity
@Table(name = "disputes", schema = "payment")
class Dispute(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "transaction_id", nullable = false)
    val transactionId: UUID,

    @Column(name = "family_id")
    val familyId: UUID? = null,

    @Column(name = "child_id")
    val childId: UUID? = null,

    @Column(name = "raised_by", nullable = false)
    val raisedBy: UUID,

    @Enumerated(EnumType.STRING)
    @Column(name = "reason", nullable = false)
    val reason: DisputeReason,

    @Column(name = "description")
    var description: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    var status: DisputeStatus = DisputeStatus.OPEN,

    @Column(name = "resolution")
    var resolution: String? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),
)
