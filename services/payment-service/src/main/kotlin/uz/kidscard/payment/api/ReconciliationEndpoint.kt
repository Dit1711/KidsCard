package uz.kidscard.payment.api

import org.springframework.boot.actuate.endpoint.annotation.Endpoint
import org.springframework.boot.actuate.endpoint.annotation.ReadOperation
import org.springframework.stereotype.Component
import uz.kidscard.payment.service.ReconciliationReport
import uz.kidscard.payment.service.ReconciliationService

/**
 * Read-only actuator endpoint exposing the latest ledger reconciliation report
 * at `/actuator/reconciliation` for ops / compliance visibility.
 */
@Component
@Endpoint(id = "reconciliation")
class ReconciliationEndpoint(
    private val reconciliationService: ReconciliationService,
) {
    @ReadOperation
    fun report(): ReconciliationReport = reconciliationService.latest()
}
