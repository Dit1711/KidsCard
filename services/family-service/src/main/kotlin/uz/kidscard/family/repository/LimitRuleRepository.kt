package uz.kidscard.family.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.family.domain.LimitRule
import uz.kidscard.family.domain.LimitType
import java.util.UUID

interface LimitRuleRepository : JpaRepository<LimitRule, UUID> {

    fun findByChildIdAndActiveTrue(childId: UUID): List<LimitRule>

    fun findByChildIdAndLimitTypeAndActiveTrue(childId: UUID, limitType: LimitType): List<LimitRule>

    fun findByChildIdAndLimitTypeAndCategoryAndActiveTrue(
        childId: UUID,
        limitType: LimitType,
        category: String,
    ): List<LimitRule>
}
