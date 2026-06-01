package uz.kidscard.family.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.family.domain.MoneyRequest
import java.util.UUID

interface MoneyRequestRepository : JpaRepository<MoneyRequest, UUID> {

    fun findByFamilyIdOrderByCreatedAtDesc(familyId: UUID): List<MoneyRequest>

    fun findByChildIdOrderByCreatedAtDesc(childId: UUID): List<MoneyRequest>
}
