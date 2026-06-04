package uz.kidscard.compliance.api.dto

import uz.kidscard.compliance.domain.AuditLog
import java.time.Instant
import java.util.UUID

data class AuditLogDto(
    val id: UUID,
    val seq: Long?,
    val eventType: String,
    val topic: String,
    val aggregateId: UUID?,
    val familyId: UUID?,
    val entryHash: String,
    val prevHash: String,
    val createdAt: Instant,
)

fun AuditLog.toDto() = AuditLogDto(
    id = id,
    seq = seq,
    eventType = eventType,
    topic = topic,
    aggregateId = aggregateId,
    familyId = familyId,
    entryHash = entryHash,
    prevHash = prevHash,
    createdAt = createdAt,
)
