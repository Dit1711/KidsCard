package uz.kidscard.card.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.card.domain.CardStatus
import uz.kidscard.card.domain.KidsCard
import java.util.UUID

interface KidsCardRepository : JpaRepository<KidsCard, UUID> {

    // Ordered by createdAt so the oldest card is consistently "primary"
    // (first in lists, default for balance display / chore rewards).
    fun findByChildIdOrderByCreatedAtAsc(childId: UUID): List<KidsCard>

    fun findByFamilyIdOrderByCreatedAtAsc(familyId: UUID): List<KidsCard>

    fun findByIdAndFamilyId(id: UUID, familyId: UUID): KidsCard?

    fun findByChildIdAndStatusOrderByCreatedAtAsc(childId: UUID, status: CardStatus): List<KidsCard>

    fun findByFamilyIdAndChildIdOrderByCreatedAtAsc(familyId: UUID, childId: UUID): List<KidsCard>
}
