package uz.kidscard.card.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

enum class AllowanceFrequency { WEEKLY, MONTHLY }

@Entity
@Table(name = "allowance_schedules", schema = "card")
class AllowanceSchedule(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "card_id", nullable = false)
    val card: KidsCard,

    @Column(name = "amount_uzs", nullable = false)
    val amountUzs: Long,

    @Enumerated(EnumType.STRING)
    @Column(name = "frequency", nullable = false, length = 32)
    val frequency: AllowanceFrequency,

    @Column(name = "day_of_week", columnDefinition = "SMALLINT")
    val dayOfWeek: Short? = null,

    @Column(name = "day_of_month", columnDefinition = "SMALLINT")
    val dayOfMonth: Short? = null,

    @Column(name = "active", nullable = false)
    var active: Boolean = true,

    @Column(name = "next_run_at")
    var nextRunAt: Instant? = null,

    @Column(name = "last_run_at")
    var lastRunAt: Instant? = null,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),
)
