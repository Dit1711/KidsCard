package uz.kidscard.family.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.family.domain.Child
import uz.kidscard.family.domain.ChildStatus
import java.util.UUID

interface ChildRepository : JpaRepository<Child, UUID> {

    fun findByFamilyId(familyId: UUID): List<Child>

    fun findByFamilyIdAndId(familyId: UUID, id: UUID): Child?

    fun findByFamilyIdAndStatus(familyId: UUID, status: ChildStatus): List<Child>
}
