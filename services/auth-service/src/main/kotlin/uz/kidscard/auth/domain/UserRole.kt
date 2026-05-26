package uz.kidscard.auth.domain

import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.ManyToOne
import jakarta.persistence.MapsId
import jakarta.persistence.Table
import java.io.Serializable
import java.time.Instant
import java.util.UUID

enum class Role {
    PARENT_OWNER,
    CO_PARENT,
    ADMIN,
    SUPPORT,
    COMPLIANCE,
    PARTNER_BANK,
}

@Embeddable
data class UserRoleId(
    @Column(name = "user_id", nullable = false)
    val userId: UUID = UUID.randomUUID(),

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 64)
    val role: Role = Role.PARENT_OWNER,
) : Serializable

@Entity
@Table(name = "user_roles", schema = "auth")
class UserRole(
    @EmbeddedId
    val id: UserRoleId,

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    val user: User,

    @Column(name = "granted_at", nullable = false)
    val grantedAt: Instant = Instant.now(),

    @Column(name = "granted_by")
    val grantedBy: UUID? = null,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is UserRole) return false
        return id == other.id
    }

    override fun hashCode(): Int = id.hashCode()

    override fun toString(): String = "UserRole(userId=${id.userId}, role=${id.role})"
}
