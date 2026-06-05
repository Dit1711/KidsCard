package uz.kidscard.family.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/**
 * An on-demand "where are you right now?" request from a parent. The child app
 * (while open, with consent) polls for a PENDING request and fulfills it with a
 * one-shot location — a pull model, not continuous tracking.
 */
@Entity
@Table(name = "location_requests", schema = "family")
class LocationRequest(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "family_id", nullable = false)
    val familyId: UUID,

    @Column(name = "child_id", nullable = false)
    val childId: UUID,

    @Column(name = "requested_by", nullable = false)
    val requestedBy: UUID,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    var status: LocationRequestStatus = LocationRequestStatus.PENDING,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "fulfilled_at")
    var fulfilledAt: Instant? = null,

    @Column(name = "result_lat")
    var resultLat: Double? = null,

    @Column(name = "result_lng")
    var resultLng: Double? = null,

    @Column(name = "result_accuracy_m")
    var resultAccuracyM: Double? = null,
)

enum class LocationRequestStatus { PENDING, FULFILLED, EXPIRED }
