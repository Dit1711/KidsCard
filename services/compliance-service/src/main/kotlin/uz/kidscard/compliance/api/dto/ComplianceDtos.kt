package uz.kidscard.compliance.api.dto

import uz.kidscard.compliance.domain.AmlAlert
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

data class AmlAlertDto(
    val id: UUID,
    val familyId: UUID?,
    val childId: UUID?,
    val ruleCode: String,
    val severity: String,
    val title: String,
    val detail: String,
    val amountUzs: Long?,
    val status: String,
    val resolutionNote: String?,
    val createdAt: Instant,
    val updatedAt: Instant,
)

fun AmlAlert.toDto() = AmlAlertDto(
    id = id,
    familyId = familyId,
    childId = childId,
    ruleCode = ruleCode,
    severity = severity,
    title = title,
    detail = detail,
    amountUzs = amountUzs,
    status = status,
    resolutionNote = resolutionNote,
    createdAt = createdAt,
    updatedAt = updatedAt,
)

/** Compliance officer transitions an alert (OPEN → REVIEWING / CLEARED / ESCALATED). */
data class UpdateAlertStatusRequest(
    val status: String,
    val note: String? = null,
)
