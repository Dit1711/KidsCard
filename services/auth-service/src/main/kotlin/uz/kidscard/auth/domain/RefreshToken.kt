package uz.kidscard.auth.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.PrePersist
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "refresh_tokens", schema = "auth")
class RefreshToken(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @Column(name = "token_hash", nullable = false, unique = true, length = 255)
    val tokenHash: String,

    @Column(name = "device_id", length = 255)
    val deviceId: String? = null,

    // Stored as text/JSONB containing device information JSON
    @Column(name = "device_info", columnDefinition = "jsonb")
    val deviceInfo: String? = null,

    @Column(name = "expires_at", nullable = false)
    val expiresAt: Instant,

    @Column(name = "revoked", nullable = false)
    var revoked: Boolean = false,

    @Column(name = "revoked_at")
    var revokedAt: Instant? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now(),
) {
    @PrePersist
    fun prePersist() {
        createdAt = Instant.now()
    }

    fun revoke() {
        revoked = true
        revokedAt = Instant.now()
    }

    fun isExpired(): Boolean = Instant.now().isAfter(expiresAt)

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is RefreshToken) return false
        return id == other.id
    }

    override fun hashCode(): Int = id.hashCode()

    override fun toString(): String = "RefreshToken(id=$id, userId=${user.id}, revoked=$revoked)"
}
