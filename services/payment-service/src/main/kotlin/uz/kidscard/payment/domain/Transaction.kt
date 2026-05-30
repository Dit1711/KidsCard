package uz.kidscard.payment.domain

import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.OneToMany
import jakarta.persistence.PostLoad
import jakarta.persistence.PostPersist
import jakarta.persistence.Table
import jakarta.persistence.Transient
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import org.springframework.data.domain.Persistable
import java.time.Instant
import java.util.UUID

enum class TransactionType { TOPUP, PURCHASE, REFUND, TRANSFER, ALLOWANCE }
enum class TransactionStatus { PENDING, COMPLETED, FAILED, REVERSED }
enum class Direction { DEBIT, CREDIT }

@Entity
@Table(name = "transactions", schema = "payment")
class Transaction(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    @get:JvmName("getEntityId")
    val id: UUID = UUID.randomUUID(),

    @Column(name = "idempotency_key", nullable = false, unique = true)
    val idempotencyKey: String,

    @Column(name = "card_id", nullable = false)
    val cardId: UUID,

    @Column(name = "child_id", nullable = false)
    val childId: UUID,

    @Column(name = "family_id", nullable = false)
    val familyId: UUID,

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    val type: TransactionType,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    var status: TransactionStatus = TransactionStatus.PENDING,

    @Column(name = "amount_uzs", nullable = false)
    val amountUzs: Long,

    @Column(name = "currency", nullable = false)
    val currency: String = "UZS",

    @Enumerated(EnumType.STRING)
    @Column(name = "direction", nullable = false)
    val direction: Direction,

    @Column(name = "merchant_name")
    val merchantName: String? = null,

    @Column(name = "merchant_mcc")
    val merchantMcc: String? = null,

    @Column(name = "merchant_country")
    val merchantCountry: String? = null,

    @Column(name = "description")
    val description: String? = null,

    @Column(name = "external_ref")
    val externalRef: String? = null,

    @Column(name = "authorized_at")
    var authorizedAt: Instant? = null,

    @Column(name = "captured_at")
    var capturedAt: Instant? = null,

    @Column(name = "failed_at")
    var failedAt: Instant? = null,

    @Column(name = "failed_reason")
    var failedReason: String? = null,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),

    @Column(name = "version", nullable = false)
    var version: Long = 0L,
) : Persistable<UUID> {

    @OneToMany(mappedBy = "transaction", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    val ledgerEntries: MutableList<LedgerEntry> = mutableListOf()

    @Transient
    private var _isNew: Boolean = true

    override fun getId(): UUID = id
    override fun isNew(): Boolean = _isNew

    @PostPersist
    @PostLoad
    fun markNotNew() {
        _isNew = false
    }
}
