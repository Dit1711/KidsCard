package uz.kidscard.card.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.Version
import java.time.Instant
import java.util.UUID

enum class CardType { VIRTUAL, PHYSICAL }
enum class CardNetwork { UZCARD, HUMO, VISA }
enum class CardStatus { PENDING, ACTIVE, FROZEN, BLOCKED, EXPIRED }

@Entity
@Table(name = "kids_cards", schema = "card")
class KidsCard(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "child_id", nullable = false)
    val childId: UUID,

    @Column(name = "family_id", nullable = false)
    val familyId: UUID,

    @Enumerated(EnumType.STRING)
    @Column(name = "card_type", nullable = false, length = 16)
    val cardType: CardType,

    @Column(name = "card_token", nullable = false, unique = true)
    val cardToken: String,

    @Column(name = "masked_pan", nullable = false, length = 19)
    val maskedPan: String,

    @Column(name = "expiry_month", nullable = false, columnDefinition = "SMALLINT")
    val expiryMonth: Short,

    @Column(name = "expiry_year", nullable = false, columnDefinition = "SMALLINT")
    val expiryYear: Short,

    @Enumerated(EnumType.STRING)
    @Column(name = "network", nullable = false, length = 32)
    val network: CardNetwork = CardNetwork.UZCARD,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    var status: CardStatus = CardStatus.PENDING,

    @Column(name = "frozen_by")
    var frozenBy: UUID? = null,

    @Column(name = "frozen_at")
    var frozenAt: Instant? = null,

    @Column(name = "issued_at")
    var issuedAt: Instant? = null,

    @Column(name = "balance_uzs", nullable = false)
    var balanceUzs: Long = 0,

    @Column(name = "balance_cached_at")
    var balanceCachedAt: Instant? = null,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),

    @Version
    @Column(name = "version", nullable = false)
    var version: Long = 0,
)
