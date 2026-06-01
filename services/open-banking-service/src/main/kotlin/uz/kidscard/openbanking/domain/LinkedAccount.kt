package uz.kidscard.openbanking.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "linked_accounts", schema = "open_banking")
class LinkedAccount(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "consent_id", nullable = false)
    val consentId: UUID,

    @Column(name = "parent_id", nullable = false)
    val parentId: UUID,

    @Column(name = "bank_code", nullable = false)
    val bankCode: String,

    @Column(name = "external_account_id", nullable = false)
    val externalAccountId: String,

    @Column(name = "account_type", nullable = false)
    val accountType: String,

    @Column(name = "masked_number")
    val maskedNumber: String? = null,

    @Column(name = "holder_name")
    val holderName: String? = null,

    @Column(name = "currency", nullable = false)
    val currency: String = "UZS",

    @Column(name = "status", nullable = false)
    var status: String = "ACTIVE",

    @Column(name = "balance_uzs")
    var balanceUzs: Long? = null,

    @Column(name = "balance_cached_at")
    var balanceCachedAt: Instant? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),
)
