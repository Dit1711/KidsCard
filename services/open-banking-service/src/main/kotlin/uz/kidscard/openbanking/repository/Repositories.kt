package uz.kidscard.openbanking.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.common.outbox.OutboxEvent
import uz.kidscard.common.outbox.OutboxStatus
import uz.kidscard.openbanking.domain.BankConsent
import uz.kidscard.openbanking.domain.BankPaymentRequest
import uz.kidscard.openbanking.domain.LinkedAccount
import java.util.Optional
import java.util.UUID

interface BankConsentRepository : JpaRepository<BankConsent, UUID> {
    fun findByParentIdOrderByCreatedAtDesc(parentId: UUID): List<BankConsent>
}

interface LinkedAccountRepository : JpaRepository<LinkedAccount, UUID> {
    fun findByParentIdAndStatus(parentId: UUID, status: String): List<LinkedAccount>
}

interface BankPaymentRequestRepository : JpaRepository<BankPaymentRequest, UUID> {
    fun findByIdempotencyKey(key: String): Optional<BankPaymentRequest>
}

interface OutboxEventRepository : JpaRepository<OutboxEvent, UUID> {
    fun findTop50ByStatusOrderByCreatedAt(status: OutboxStatus): List<OutboxEvent>
}
