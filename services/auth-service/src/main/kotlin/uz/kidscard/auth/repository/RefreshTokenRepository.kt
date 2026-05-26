package uz.kidscard.auth.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.auth.domain.RefreshToken
import uz.kidscard.auth.domain.User
import java.util.Optional
import java.util.UUID

interface RefreshTokenRepository : JpaRepository<RefreshToken, UUID> {
    fun findByTokenHashAndRevokedFalse(tokenHash: String): Optional<RefreshToken>
    fun findAllByUserAndRevokedFalse(user: User): List<RefreshToken>
}
