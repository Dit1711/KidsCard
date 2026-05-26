package uz.kidscard.family.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import jakarta.persistence.Version
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "parents", schema = "family")
class Parent(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_id", nullable = false)
    val family: Family,

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    val role: ParentRole,

    @Column(name = "user_id", nullable = false, unique = true)
    val userId: UUID,

    @Column(name = "phone", nullable = false)
    val phone: String,

    @Column(name = "full_name", nullable = false)
    var fullName: String,

    @Enumerated(EnumType.STRING)
    @Column(name = "kyc_status", nullable = false)
    var kycStatus: KycStatus = KycStatus.PENDING,

    @Column(name = "kyc_verified_at")
    var kycVerifiedAt: Instant? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    var status: ParentStatus = ParentStatus.ACTIVE,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),

    @Version
    @Column(name = "version", nullable = false)
    var version: Long = 0,
)

enum class ParentRole { OWNER, CO_PARENT }
enum class KycStatus { PENDING, IN_PROGRESS, APPROVED, REJECTED }
enum class ParentStatus { ACTIVE, SUSPENDED }
