package uz.kidscard.family.domain

import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.OneToMany
import jakarta.persistence.Table
import jakarta.persistence.Version
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "families", schema = "family")
class Family(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "name", nullable = false)
    var name: String,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    var status: FamilyStatus = FamilyStatus.ACTIVE,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),

    @Version
    @Column(name = "version", nullable = false)
    var version: Long = 0,

    @OneToMany(mappedBy = "family", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    val parents: MutableList<Parent> = mutableListOf(),

    @OneToMany(mappedBy = "family", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    val children: MutableList<Child> = mutableListOf(),
)

enum class FamilyStatus { ACTIVE, SUSPENDED, CLOSED }
