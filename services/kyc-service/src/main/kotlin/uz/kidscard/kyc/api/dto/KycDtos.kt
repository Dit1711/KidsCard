package uz.kidscard.kyc.api.dto

import jakarta.validation.constraints.NotNull
import uz.kidscard.kyc.domain.DocumentType
import uz.kidscard.kyc.domain.VerificationSession
import uz.kidscard.kyc.domain.VerificationType
import java.time.Instant
import java.util.UUID

// ── Requests ─────────────────────────────────────────────────────────────────

data class StartSessionRequest(
    val type: VerificationType = VerificationType.PARENT,
)

data class UploadDocumentRequest(
    @field:NotNull val docType: DocumentType,
    // In a real flow these are pre-signed S3 URLs of the uploaded scans.
    // For the mock flow any non-null marker works.
    val frontUrl: String? = "mock://document/front",
    val backUrl: String? = "mock://document/back",
)

data class LivenessRequest(
    val videoUrl: String? = "mock://liveness/selfie",
)

// ── Responses ─────────────────────────────────────────────────────────────────

data class SessionDto(
    val id: UUID,
    val userId: UUID,
    val type: String,
    val status: String,
    val provider: String,
    val rejectionReason: String?,
    val expiresAt: Instant,
    val approvedAt: Instant?,
    val createdAt: Instant,
)

fun VerificationSession.toDto() = SessionDto(
    id = id,
    userId = userId,
    type = type.name,
    status = status.name,
    provider = provider,
    rejectionReason = rejectionReason,
    expiresAt = expiresAt,
    approvedAt = approvedAt,
    createdAt = createdAt,
)
