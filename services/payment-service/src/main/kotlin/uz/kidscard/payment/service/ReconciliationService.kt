package uz.kidscard.payment.service

import io.micrometer.core.instrument.MeterRegistry
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.payment.repository.ReconciliationRepository
import java.time.Instant
import java.util.concurrent.atomic.AtomicLong

/**
 * Snapshot of the most recent ledger reconciliation run. Exposed (read-only) via
 * the `reconciliation` actuator endpoint and reflected in Micrometer gauges.
 */
data class ReconciliationReport(
    val ranAt: Instant?,
    val healthy: Boolean,
    val unbalancedTransactionCount: Int,
    val negativeAccountCount: Int,
    val systemWideNet: Long,
    val unbalancedTransactionSample: List<String>,
    val negativeAccountSample: List<String>,
) {
    companion object {
        val NEVER_RUN = ReconciliationReport(
            ranAt = null, healthy = true, unbalancedTransactionCount = 0,
            negativeAccountCount = 0, systemWideNet = 0, unbalancedTransactionSample = emptyList(),
            negativeAccountSample = emptyList(),
        )
    }
}

/**
 * Periodically re-derives the ledger's invariants from scratch and flags any
 * drift. This is the safety net behind idempotency: even if a bug or a partial
 * failure ever corrupted the ledger, reconciliation surfaces it (logs + metrics
 * + actuator) rather than letting it pass silently.
 *
 * The job only READS — it never mutates the ledger. Remediation of a real
 * discrepancy is a deliberate human/ops decision, not something to auto-correct.
 */
@Service
class ReconciliationService(
    private val reconciliationRepository: ReconciliationRepository,
    meterRegistry: MeterRegistry,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    private val unbalancedGauge = AtomicLong(0)
    private val negativeGauge = AtomicLong(0)
    private val systemNetGauge = AtomicLong(0)

    @Volatile
    private var lastReport: ReconciliationReport = ReconciliationReport.NEVER_RUN

    init {
        meterRegistry.gauge("payment.reconciliation.unbalanced.transactions", unbalancedGauge)
        meterRegistry.gauge("payment.reconciliation.negative.accounts", negativeGauge)
        meterRegistry.gauge("payment.reconciliation.systemwide.net", systemNetGauge)
    }

    /** Latest reconciliation snapshot (served by the actuator endpoint). */
    fun latest(): ReconciliationReport = lastReport

    /**
     * Runs ~1 min after startup, then every 15 min (both overridable). Read-only,
     * so it is safe to run on every instance; under contention the worst case is
     * a duplicated read, never a write conflict.
     */
    @Scheduled(
        initialDelayString = "\${app.reconciliation.initial-delay-ms:60000}",
        fixedDelayString = "\${app.reconciliation.interval-ms:900000}",
    )
    @Transactional(readOnly = true)
    fun reconcile(): ReconciliationReport {
        val unbalanced = reconciliationRepository.findUnbalancedTransactionIds()
        val negative = reconciliationRepository.findNegativeBalanceAccounts()
        val systemNet = reconciliationRepository.systemWideNet()

        val healthy = unbalanced.isEmpty() && negative.isEmpty() && systemNet == 0L

        unbalancedGauge.set(unbalanced.size.toLong())
        negativeGauge.set(negative.size.toLong())
        systemNetGauge.set(systemNet)

        if (healthy) {
            log.info("Reconciliation OK: ledger balanced, no negative accounts, system net = 0")
        } else {
            // ERROR — these are money-integrity violations that need a human to look.
            log.error(
                "Reconciliation FOUND DISCREPANCIES: unbalancedTransactions={} negativeAccounts={} systemWideNet={}",
                unbalanced.size, negative.size, systemNet,
            )
            if (unbalanced.isNotEmpty()) log.error("  unbalanced tx (up to 20): {}", unbalanced.take(20))
            if (negative.isNotEmpty()) log.error("  negative accounts (up to 20): {}", negative.take(20))
            if (systemNet != 0L) log.error("  system-wide ledger net is non-zero: {} (money created/destroyed)", systemNet)
        }

        val report = ReconciliationReport(
            ranAt = Instant.now(),
            healthy = healthy,
            unbalancedTransactionCount = unbalanced.size,
            negativeAccountCount = negative.size,
            systemWideNet = systemNet,
            unbalancedTransactionSample = unbalanced.take(20).map { it.toString() },
            negativeAccountSample = negative.take(20),
        )
        lastReport = report
        return report
    }
}
