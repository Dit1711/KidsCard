package uz.kidscard.auth.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.auth.domain.User
import java.util.Optional
import java.util.UUID

interface UserRepository : JpaRepository<User, UUID> {
    fun findByPhone(phone: String): Optional<User>
    fun existsByPhone(phone: String): Boolean
}
