package uz.kidscard.ai.service

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.ai.domain.ChildAiSettings
import uz.kidscard.ai.repository.ChildAiSettingsRepository
import java.time.Instant
import java.util.UUID

/** Effective AI controls for a child, merging parent overrides with defaults. */
data class EffectiveAiSettings(
    val enabled: Boolean,
    val dailyLimit: Int,
    /** True when the parent has explicitly set a custom daily limit. */
    val dailyLimitCustom: Boolean,
)

@Service
@Transactional
class AiSettingsService(
    private val settingsRepository: ChildAiSettingsRepository,
    @Value("\${app.ai.daily-message-limit}") private val defaultDailyLimit: Int,
) {
    @Transactional(readOnly = true)
    fun effective(childId: UUID): EffectiveAiSettings {
        val s = settingsRepository.findById(childId).orElse(null)
        return EffectiveAiSettings(
            enabled = s?.enabled ?: true,
            dailyLimit = s?.dailyLimit ?: defaultDailyLimit,
            dailyLimitCustom = s?.dailyLimit != null,
        )
    }

    /** Upsert parent controls. A null [dailyLimit] clears the override. */
    fun update(childId: UUID, enabled: Boolean, dailyLimit: Int?): EffectiveAiSettings {
        val sanitized = dailyLimit?.coerceIn(1, 500)
        val s = settingsRepository.findById(childId).orElse(ChildAiSettings(childId = childId))
        s.enabled = enabled
        s.dailyLimit = sanitized
        s.updatedAt = Instant.now()
        settingsRepository.save(s)
        return EffectiveAiSettings(
            enabled = enabled,
            dailyLimit = sanitized ?: defaultDailyLimit,
            dailyLimitCustom = sanitized != null,
        )
    }
}
