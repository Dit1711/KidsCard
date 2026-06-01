package uz.kidscard.payment.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.PostLoad
import jakarta.persistence.PostPersist
import jakarta.persistence.Table
import jakarta.persistence.Transient
import org.springframework.data.domain.Persistable
import java.time.Instant
import java.util.UUID

enum class AccountType { CARD, FLOAT, REVENUE, WALLET }

@Entity
@Table(name = "ledger_entries", schema = "payment")
class LedgerEntry(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    @get:JvmName("getEntityId")
    val id: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id", nullable = false)
    val transaction: Transaction,

    @Column(name = "account_id", nullable = false)
    val accountId: String,

    @Enumerated(EnumType.STRING)
    @Column(name = "account_type", nullable = false)
    val accountType: AccountType,

    @Enumerated(EnumType.STRING)
    @Column(name = "direction", nullable = false)
    val direction: Direction,

    @Column(name = "amount_uzs", nullable = false)
    val amountUzs: Long,

    @Column(name = "running_balance", nullable = false)
    val runningBalance: Long,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now(),
) : Persistable<UUID> {

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
