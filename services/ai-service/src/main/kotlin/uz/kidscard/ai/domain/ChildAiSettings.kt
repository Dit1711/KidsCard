package uz.kidscard.ai.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/**
 * Parent-managed controls for one child's AI tutor.
 *
 * Absent row → defaults (enabled, global daily limit). Parents flip [enabled]
 * (this IS the per-child consent gate) and may override [dailyLimit].
 */
@Entity
@Table(name = "child_ai_settings", schema = "ai")
class ChildAiSettings(
    @Id
    @Column(name = "child_id", updatable = false, nullable = false)
    val childId: UUID,

    /** Whether the child may use the tutor at all (parental consent switch). */
    @Column(name = "enabled", nullable = false)
    var enabled: Boolean = true,

    /** Per-child daily message cap; null → fall back to the global default. */
    @Column(name = "daily_limit")
    var dailyLimit: Int? = null,

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),
)
