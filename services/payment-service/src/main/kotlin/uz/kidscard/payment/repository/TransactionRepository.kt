package uz.kidscard.payment.repository

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import uz.kidscard.payment.domain.Transaction
import uz.kidscard.payment.domain.TransactionStatus
import uz.kidscard.payment.domain.TransactionType
import java.util.Optional
import java.util.UUID

interface TransactionRepository : JpaRepository<Transaction, UUID> {
    fun findByIdempotencyKey(key: String): Optional<Transaction>
    fun findByCardIdOrderByCreatedAtDesc(cardId: UUID, pageable: Pageable): Page<Transaction>
    fun findByFamilyIdOrderByCreatedAtDesc(familyId: UUID, pageable: Pageable): Page<Transaction>
    fun findByChildIdOrderByCreatedAtDesc(childId: UUID, pageable: Pageable): Page<Transaction>

    /** Purchases awaiting parent approval (PC-05). */
    fun findByFamilyIdAndStatusAndTypeOrderByCreatedAtDesc(
        familyId: UUID, status: TransactionStatus, type: TransactionType,
    ): List<Transaction>
}
