package uz.kidscard.payment.repository

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import uz.kidscard.payment.domain.LedgerEntry
import java.util.UUID

/**
 * Aggregate integrity checks over the double-entry ledger, used by the periodic
 * reconciliation job.
 *
 * All queries are pure aggregates (SUM / GROUP BY / HAVING) and therefore
 * independent of row ordering — they have no false positives from same-instant
 * inserts. They assert the ledger's core invariants:
 *  - every transaction's postings net to zero (no money created or destroyed);
 *  - the whole ledger nets to zero system-wide;
 *  - no user-facing account (CARD / WALLET / SAVINGS) is ever negative.
 */
interface ReconciliationRepository : JpaRepository<LedgerEntry, UUID> {

    /** Transaction ids whose debit/credit postings do NOT net to zero. */
    @Query(
        nativeQuery = true,
        value = """
            SELECT e.transaction_id
            FROM payment.ledger_entries e
            GROUP BY e.transaction_id
            HAVING SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount_uzs ELSE -e.amount_uzs END) <> 0
        """,
    )
    fun findUnbalancedTransactionIds(): List<UUID>

    /** "ACCOUNT_TYPE:account_id" for any user-facing account with a negative computed balance. */
    @Query(
        nativeQuery = true,
        value = """
            SELECT e.account_type || ':' || e.account_id
            FROM payment.ledger_entries e
            WHERE e.account_type IN ('CARD', 'WALLET', 'SAVINGS')
            GROUP BY e.account_type, e.account_id
            HAVING SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount_uzs ELSE -e.amount_uzs END) < 0
        """,
    )
    fun findNegativeBalanceAccounts(): List<String>

    /** Net of the entire ledger; must be exactly 0 in a balanced double-entry system. */
    @Query(
        nativeQuery = true,
        value = """
            SELECT COALESCE(SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount_uzs ELSE -e.amount_uzs END), 0)
            FROM payment.ledger_entries e
        """,
    )
    fun systemWideNet(): Long
}
