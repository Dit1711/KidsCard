package uz.kidscard.auth.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.auth.domain.ChildCredential
import java.util.Optional
import java.util.UUID

interface ChildCredentialRepository : JpaRepository<ChildCredential, UUID> {
    fun findByLoginCode(loginCode: String): Optional<ChildCredential>
    fun findByChildId(childId: UUID): Optional<ChildCredential>
    fun existsByLoginCode(loginCode: String): Boolean
}
