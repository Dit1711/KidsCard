package uz.kidscard.family.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.family.domain.Consent
import uz.kidscard.family.domain.ConsentType
import java.util.UUID

interface ConsentRepository : JpaRepository<Consent, UUID> {
    fun findByUserId(userId: UUID): List<Consent>
    fun existsByUserIdAndTypeAndVersion(userId: UUID, type: ConsentType, version: String): Boolean
}
