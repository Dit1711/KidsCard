package uz.kidscard.auth.domain

import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.OneToMany
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import jakarta.persistence.Version
import java.time.Instant
import java.util.UUID

enum class UserStatus { ACTIVE, BLOCKED, DELETED }

@Entity
@Table(name = "users", schema = "auth")
class User(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "phone", nullable = false, unique = true, length = 20)
    val phone: String,

    @Column(name = "phone_verified", nullable = false)
    var phoneVerified: Boolean = false,

    @Column(name = "email", length = 255)
    var email: String? = null,

    @Column(name = "email_verified", nullable = false)
    var emailVerified: Boolean = false,

    @Column(name = "password_hash", length = 255)
    var passwordHash: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    var status: UserStatus = UserStatus.ACTIVE,

    @Column(name = "last_login_at")
    var lastLoginAt: Instant? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),

    @Version
    @Column(name = "version", nullable = false)
    var version: Long = 0L,
) {
    @OneToMany(mappedBy = "user", cascade = [CascadeType.ALL], fetch = FetchType.LAZY, orphanRemoval = true)
    val roles: MutableSet<UserRole> = mutableSetOf()

    @PrePersist
    fun prePersist() {
        createdAt = Instant.now()
        updatedAt = Instant.now()
    }

    @PreUpdate
    fun preUpdate() {
        updatedAt = Instant.now()
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is User) return false
        return id == other.id
    }

    override fun hashCode(): Int = id.hashCode()

    override fun toString(): String = "User(id=$id, phone=$phone, status=$status)"
}
