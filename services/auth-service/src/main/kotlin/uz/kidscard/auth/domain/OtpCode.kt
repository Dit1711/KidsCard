package uz.kidscard.auth.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

enum class OtpPurpose { REGISTRATION, LOGIN, PASSWORD_RESET }

@Entity
@Table(name = "otp_codes", schema = "auth")
class OtpCode(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "phone", nullable = false, length = 20)
    val phone: String,

    @Column(name = "code_hash", nullable = false, length = 255)
    val codeHash: String,

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", nullable = false, length = 32)
    val purpose: OtpPurpose,

    @Column(name = "expires_at", nullable = false)
    val expiresAt: Instant,

    @Column(name = "attempts", nullable = false)
    var attempts: Int = 0,

    @Column(name = "used", nullable = false)
    var used: Boolean = false,

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now(),
) {
    @PrePersist
    fun prePersist() {
        createdAt = Instant.now()
    }

    fun isExpired(): Boolean = Instant.now().isAfter(expiresAt)

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is OtpCode) return false
        return id == other.id
    }

    override fun hashCode(): Int = id.hashCode()

    override fun toString(): String = "OtpCode(id=$id, phone=$phone, purpose=$purpose, used=$used)"
}
