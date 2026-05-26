package uz.kidscard.auth.repository

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import uz.kidscard.auth.domain.OtpCode
import uz.kidscard.auth.domain.OtpPurpose
import java.time.Instant
import java.util.UUID

interface OtpCodeRepository : JpaRepository<OtpCode, UUID> {

    @Query(
        "SELECT o FROM OtpCode o WHERE o.phone = :phone AND o.purpose = :purpose " +
            "AND o.used = false AND o.expiresAt > :now ORDER BY o.createdAt DESC",
    )
    fun findActive(
        @Param("phone") phone: String,
        @Param("purpose") purpose: OtpPurpose,
        @Param("now") now: Instant,
    ): List<OtpCode>

    @Query(
        "SELECT COUNT(o) FROM OtpCode o WHERE o.phone = :phone AND o.createdAt > :since",
    )
    fun countRecentByPhone(
        @Param("phone") phone: String,
        @Param("since") since: Instant,
    ): Long
}
