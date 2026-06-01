package uz.kidscard.payment.repository

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import uz.kidscard.payment.domain.LedgerEntry
import java.util.UUID

interface LedgerEntryRepository : JpaRepository<LedgerEntry, UUID> {

    @Query("""
        SELECT COALESCE(SUM(
            CASE WHEN e.direction = 'CREDIT' THEN e.amountUzs
                 ELSE -e.amountUzs END
        ), 0)
        FROM LedgerEntry e
        WHERE e.accountId = :accountId AND e.accountType = uz.kidscard.payment.domain.AccountType.CARD
    """)
    fun computeBalance(accountId: String): Long

    fun findTopByAccountIdOrderByCreatedAtDesc(accountId: String): LedgerEntry?

    @Query("""
        SELECT COALESCE(SUM(
            CASE WHEN e.direction = 'CREDIT' THEN e.amountUzs
                 ELSE -e.amountUzs END
        ), 0)
        FROM LedgerEntry e
        WHERE e.accountId = :accountId AND e.accountType = uz.kidscard.payment.domain.AccountType.WALLET
    """)
    fun computeWalletBalance(accountId: String): Long

    @Query("""
        SELECT COALESCE(SUM(
            CASE WHEN e.direction = 'CREDIT' THEN e.amountUzs
                 ELSE -e.amountUzs END
        ), 0)
        FROM LedgerEntry e
        WHERE e.accountId = :accountId AND e.accountType = uz.kidscard.payment.domain.AccountType.SAVINGS
    """)
    fun computeSavingsBalance(accountId: String): Long

    @Query("""
        SELECT COALESCE(SUM(e.amountUzs), 0)
        FROM LedgerEntry e
        WHERE e.accountId = :accountId
          AND e.accountType = uz.kidscard.payment.domain.AccountType.CARD
          AND e.direction = uz.kidscard.payment.domain.Direction.DEBIT
          AND e.transaction.type = uz.kidscard.payment.domain.TransactionType.PURCHASE
          AND e.createdAt >= :since
    """)
    fun computeSpentSince(accountId: String, since: java.time.Instant): Long

    @Query("""
        SELECT COALESCE(SUM(e.amountUzs), 0)
        FROM LedgerEntry e
        WHERE e.accountId = :accountId
          AND e.accountType = uz.kidscard.payment.domain.AccountType.CARD
          AND e.direction = uz.kidscard.payment.domain.Direction.DEBIT
          AND e.transaction.type = uz.kidscard.payment.domain.TransactionType.PURCHASE
          AND e.transaction.merchantMcc = :mcc
          AND e.createdAt >= :since
    """)
    fun computeCategorySpentSince(accountId: String, mcc: String, since: java.time.Instant): Long

    @Query("""
        SELECT DISTINCT e.accountId FROM LedgerEntry e
        WHERE e.accountType = uz.kidscard.payment.domain.AccountType.SAVINGS
    """)
    fun findSavingsAccountIds(): List<String>

    /** All PURCHASE debits on a card since a date — raw rows for spend analytics. */
    @Query("""
        SELECT new uz.kidscard.payment.api.dto.SpendRow(
            e.transaction.merchantMcc, e.amountUzs, e.createdAt
        )
        FROM LedgerEntry e
        WHERE e.accountId = :accountId
          AND e.accountType = uz.kidscard.payment.domain.AccountType.CARD
          AND e.direction = uz.kidscard.payment.domain.Direction.DEBIT
          AND e.transaction.type = uz.kidscard.payment.domain.TransactionType.PURCHASE
          AND e.createdAt >= :since
    """)
    fun spendRowsSince(accountId: String, since: java.time.Instant): List<uz.kidscard.payment.api.dto.SpendRow>
}
