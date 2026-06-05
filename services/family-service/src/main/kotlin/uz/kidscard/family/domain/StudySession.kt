package uz.kidscard.family.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

/**
 * One row per (child, day) the child studied with the AI tutor. Recorded by
 * ai-service (best-effort) on a successful tutor exchange. Capped at one per day
 * so gamification XP and the activity streak can't be farmed by spamming chat —
 * XP is DERIVED from the count of distinct study days, mirroring lessons/chores.
 */
@Entity
@Table(name = "study_sessions", schema = "family")
class StudySession(
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "child_id", nullable = false)
    val childId: UUID,

    /** The study day (Asia/Tashkent); unique together with child_id. */
    @Column(name = "study_date", nullable = false)
    val studyDate: LocalDate,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),
)
