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
 * A one-shot geolocation ping reported by the child's app (with consent):
 * either when the app is opened (APP_OPEN) or at the moment of a purchase
 * (PURCHASE, with merchant + amount). Powers the parent's "where's my child"
 * map — last known place + spending locations. Not continuous tracking.
 */
@Entity
@Table(name = "child_locations", schema = "family")
class ChildLocation(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "family_id", nullable = false)
    val familyId: UUID,

    @Column(name = "child_id", nullable = false)
    val childId: UUID,

    @Column(name = "lat", nullable = false)
    val lat: Double,

    @Column(name = "lng", nullable = false)
    val lng: Double,

    @Column(name = "accuracy_m")
    val accuracyM: Double? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false)
    val kind: LocationKind,

    /** Merchant name for PURCHASE pings (denormalized; null otherwise). */
    @Column(name = "label")
    val label: String? = null,

    /** Amount for PURCHASE pings (null otherwise). */
    @Column(name = "amount_uzs")
    val amountUzs: Long? = null,

    @Column(name = "captured_at", nullable = false)
    val capturedAt: Instant = Instant.now(),
)

enum class LocationKind { APP_OPEN, PURCHASE }
