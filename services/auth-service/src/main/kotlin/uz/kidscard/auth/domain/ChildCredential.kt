package uz.kidscard.auth.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "child_credentials", schema = "auth")
class ChildCredential(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "child_id", nullable = false, unique = true)
    val childId: UUID,

    @Column(name = "family_id", nullable = false)
    val familyId: UUID,

    @Column(name = "login_code", nullable = false, unique = true)
    var loginCode: String,

    @Column(name = "pin_hash", nullable = false)
    var pinHash: String,

    @Column(name = "display_name")
    var displayName: String? = null,

    @Column(name = "active", nullable = false)
    var active: Boolean = true,

    @Column(name = "last_login_at")
    var lastLoginAt: Instant? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),
)
