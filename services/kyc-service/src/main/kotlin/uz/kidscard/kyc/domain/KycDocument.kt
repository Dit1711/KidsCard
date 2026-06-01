package uz.kidscard.kyc.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

enum class DocumentType { PASSPORT, ID_CARD, DRIVING_LICENSE }

enum class DocumentStatus { PENDING, VERIFIED, REJECTED }

@Entity
@Table(name = "documents", schema = "kyc")
class KycDocument(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "session_id", nullable = false)
    val sessionId: UUID,

    @Enumerated(EnumType.STRING)
    @Column(name = "doc_type", nullable = false)
    val docType: DocumentType,

    @Column(name = "front_url")
    val frontUrl: String? = null,

    @Column(name = "back_url")
    val backUrl: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    var status: DocumentStatus = DocumentStatus.PENDING,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),
)
