package uz.kidscard.ai.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.ai.domain.ChildAiSettings
import java.util.UUID

interface ChildAiSettingsRepository : JpaRepository<ChildAiSettings, UUID>
