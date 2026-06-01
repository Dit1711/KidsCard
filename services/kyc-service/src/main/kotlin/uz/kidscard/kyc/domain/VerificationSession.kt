package uz.kidscard.kyc.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

enum class VerificationType { PARENT, CO_PARENT }

enum class VerificationStatus {
    INITIATED,
    DOCUMENTS_UPLOADED,
    LIVENESS_DONE,
    APPROVED,
    REJECTED,
    EXPIRED,
}

@Entity
@Table(name = "verification_sessions", schema = "kyc")
class VerificationSession(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "user_id", nullable = false)
    val userId: UUID,

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    val type: VerificationType,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    var status: VerificationStatus = VerificationStatus.INITIATED,

    @Column(name = "provider", nullable = false)
    val provider: String,

    @Column(name = "external_id")
    var externalId: String? = null,

    @Column(name = "rejection_reason")
    var rejectionReason: String? = null,

    @Column(name = "expires_at", nullable = false)
    val expiresAt: Instant,

    @Column(name = "approved_at")
    var approvedAt: Instant? = null,

    @Column(name = "rejected_at")
    var rejectedAt: Instant? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),
)
