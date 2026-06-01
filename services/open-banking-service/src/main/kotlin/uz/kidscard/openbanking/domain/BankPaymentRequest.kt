package uz.kidscard.openbanking.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

enum class PaymentRequestStatus { PENDING, SUBMITTED, COMPLETED, FAILED }

@Entity
@Table(name = "payment_requests", schema = "open_banking")
class BankPaymentRequest(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "idempotency_key", nullable = false, unique = true)
    val idempotencyKey: String,

    @Column(name = "consent_id", nullable = false)
    val consentId: UUID,

    @Column(name = "from_account_id", nullable = false)
    val fromAccountId: UUID,

    @Column(name = "amount_uzs", nullable = false)
    val amountUzs: Long,

    @Column(name = "currency", nullable = false)
    val currency: String = "UZS",

    @Column(name = "description")
    val description: String? = null,

    @Column(name = "status", nullable = false)
    var status: String = PaymentRequestStatus.PENDING.name,

    @Column(name = "external_ref")
    var externalRef: String? = null,

    @Column(name = "submitted_at")
    var submittedAt: Instant? = null,

    @Column(name = "completed_at")
    var completedAt: Instant? = null,

    @Column(name = "failed_reason")
    var failedReason: String? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),
)
