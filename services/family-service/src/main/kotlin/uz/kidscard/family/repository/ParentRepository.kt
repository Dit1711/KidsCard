package uz.kidscard.family.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.family.domain.Parent
import java.util.UUID

interface ParentRepository : JpaRepository<Parent, UUID> {

    fun findByUserId(userId: UUID): Parent?

    fun findByFamilyId(familyId: UUID): List<Parent>

    fun findByFamilyIdAndUserId(familyId: UUID, userId: UUID): Parent?

    fun existsByFamilyIdAndUserId(familyId: UUID, userId: UUID): Boolean
}
