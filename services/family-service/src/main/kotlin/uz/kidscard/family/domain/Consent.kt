package uz.kidscard.family.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/** Legal documents a parent must accept (KYC-04). */
enum class ConsentType {
    TERMS,        // Пользовательское соглашение
    PRIVACY,      // Политика конфиденциальности
    CHILD_DATA,   // Согласие на обработку персональных данных ребёнка
}

/**
 * An immutable record of a parent accepting one legal document at a given
 * version. We keep the full history (audit/ЗРУ); the "current" acceptance for a
 * type is the row at the required version. Document text is editorial (web app);
 * here we store only the proof of acceptance.
 */
@Entity
@Table(name = "consents", schema = "family")
class Consent(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "user_id", nullable = false)
    val userId: UUID,

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    val type: ConsentType,

    @Column(name = "version", nullable = false)
    val version: String,

    @Column(name = "ip_address")
    val ipAddress: String? = null,

    @Column(name = "user_agent", length = 512)
    val userAgent: String? = null,

    @Column(name = "granted_at", nullable = false, updatable = false)
    val grantedAt: Instant = Instant.now(),
)
