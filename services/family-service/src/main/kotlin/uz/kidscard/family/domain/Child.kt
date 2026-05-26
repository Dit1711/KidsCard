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
import uz.kidscard.common.exception.BusinessException
import java.time.Instant
import java.time.LocalDate
import java.time.Period
import java.util.UUID

@Entity
@Table(name = "children", schema = "family")
class Child(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_id", nullable = false)
    val family: Family,

    @Column(name = "full_name", nullable = false)
    var fullName: String,

    @Column(name = "date_of_birth", nullable = false)
    var dateOfBirth: LocalDate,

    @Enumerated(EnumType.STRING)
    @Column(name = "age_group", nullable = false)
    var ageGroup: AgeGroup,

    @Column(name = "avatar_url")
    var avatarUrl: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    var status: ChildStatus = ChildStatus.ACTIVE,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),

    @Version
    @Column(name = "version", nullable = false)
    var version: Long = 0,
)

enum class AgeGroup { CHILD_6_10, CHILD_11_14, TEEN_15_17 }
enum class ChildStatus { ACTIVE, INACTIVE }

fun computeAgeGroup(dateOfBirth: LocalDate): AgeGroup {
    val age = Period.between(dateOfBirth, LocalDate.now()).years
    return when {
        age in 6..10 -> AgeGroup.CHILD_6_10
        age in 11..14 -> AgeGroup.CHILD_11_14
        age in 15..17 -> AgeGroup.TEEN_15_17
        else -> throw BusinessException("INVALID_AGE", "Child must be between 6 and 17 years old")
    }
}
