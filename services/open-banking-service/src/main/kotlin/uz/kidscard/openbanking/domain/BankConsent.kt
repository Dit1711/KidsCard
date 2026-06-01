package uz.kidscard.openbanking.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

enum class ConsentType { AIS, PIS, AIS_PIS }
enum class ConsentStatus { PENDING, ACTIVE, EXPIRED, REVOKED }

@Entity
@Table(name = "bank_consents", schema = "open_banking")
class BankConsent(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    // Scoping key — holds the authenticated user's id (JWT subject).
    @Column(name = "parent_id", nullable = false)
    val parentId: UUID,

    @Column(name = "bank_code", nullable = false)
    val bankCode: String,

    @Column(name = "consent_type", nullable = false)
    val consentType: String = ConsentType.AIS_PIS.name,

    @Column(name = "external_id", nullable = false, unique = true)
    val externalId: String,

    @Column(name = "status", nullable = false)
    var status: String = ConsentStatus.PENDING.name,

    @Column(name = "access_token")
    var accessToken: String? = null,

    @Column(name = "refresh_token")
    var refreshToken: String? = null,

    @Column(name = "token_expires_at")
    var tokenExpiresAt: Instant? = null,

    @Column(name = "granted_at")
    var grantedAt: Instant? = null,

    @Column(name = "expires_at")
    var expiresAt: Instant? = null,

    @Column(name = "revoked_at")
    var revokedAt: Instant? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),
)
