package uz.kidscard.auth.service

import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.JWSHeader
import com.nimbusds.jose.crypto.MACSigner
import com.nimbusds.jose.crypto.MACVerifier
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.SignedJWT
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import uz.kidscard.auth.domain.User
import java.time.Instant
import java.util.Date
import java.util.UUID

data class Claims(
    val userId: UUID,
    val phone: String,
    val roles: List<String>,
)

@Service
class JwtService(
    @Value("\${app.jwt.secret}") private val secret: String,
    @Value("\${app.jwt.access-token-expiry:900}") private val accessTokenExpirySeconds: Long,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    private val secretBytes: ByteArray by lazy {
        val bytes = secret.toByteArray(Charsets.UTF_8)
        require(bytes.size >= 32) {
            "JWT secret must be at least 32 bytes (256 bits) for HMAC-SHA256"
        }
        bytes
    }

    fun generateAccessToken(user: User): String {
        val now = Instant.now()
        val expiry = now.plusSeconds(accessTokenExpirySeconds)

        val roles = user.roles.map { it.id.role.name }

        val claimsSet = JWTClaimsSet.Builder()
            .subject(user.id.toString())
            .claim("phone", user.phone)
            .claim("roles", roles)
            .issueTime(Date.from(now))
            .expirationTime(Date.from(expiry))
            .jwtID(UUID.randomUUID().toString())
            .build()

        val header = JWSHeader(JWSAlgorithm.HS256)
        val signedJwt = SignedJWT(header, claimsSet)
        signedJwt.sign(MACSigner(secretBytes))

        return signedJwt.serialize()
    }

    fun generateRefreshTokenValue(): String = UUID.randomUUID().toString()

    fun validateToken(token: String): Claims? {
        return try {
            val signedJwt = SignedJWT.parse(token)
            val verifier = MACVerifier(secretBytes)

            if (!signedJwt.verify(verifier)) {
                log.debug("JWT signature verification failed")
                return null
            }

            val claimsSet = signedJwt.jwtClaimsSet

            if (claimsSet.expirationTime?.before(Date()) == true) {
                log.debug("JWT token has expired")
                return null
            }

            val userId = UUID.fromString(claimsSet.subject)
            val phone = claimsSet.getStringClaim("phone")
            @Suppress("UNCHECKED_CAST")
            val roles = (claimsSet.getClaim("roles") as? List<*>)
                ?.filterIsInstance<String>()
                ?: emptyList()

            Claims(userId = userId, phone = phone, roles = roles)
        } catch (ex: Exception) {
            log.debug("JWT validation error: {}", ex.message)
            null
        }
    }

    fun getUserIdFromToken(token: String): UUID? =
        validateToken(token)?.userId
}
