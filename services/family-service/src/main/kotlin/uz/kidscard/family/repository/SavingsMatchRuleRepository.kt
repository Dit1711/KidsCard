package uz.kidscard.family.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.family.domain.SavingsMatchRule
import java.util.UUID

interface SavingsMatchRuleRepository : JpaRepository<SavingsMatchRule, UUID>
