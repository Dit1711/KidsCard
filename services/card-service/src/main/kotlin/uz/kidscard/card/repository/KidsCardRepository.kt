package uz.kidscard.card.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.card.domain.CardStatus
import uz.kidscard.card.domain.KidsCard
import java.util.UUID

interface KidsCardRepository : JpaRepository<KidsCard, UUID> {

    fun findByChildId(childId: UUID): List<KidsCard>

    fun findByFamilyId(familyId: UUID): List<KidsCard>

    fun findByIdAndFamilyId(id: UUID, familyId: UUID): KidsCard?

    fun findByChildIdAndStatus(childId: UUID, status: CardStatus): List<KidsCard>

    fun findByFamilyIdAndChildId(familyId: UUID, childId: UUID): List<KidsCard>
}
