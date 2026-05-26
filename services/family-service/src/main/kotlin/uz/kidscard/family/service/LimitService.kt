package uz.kidscard.family.service

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.common.exception.BusinessException
import uz.kidscard.common.exception.ResourceNotFoundException
import uz.kidscard.family.api.dto.LimitRuleDto
import uz.kidscard.family.api.dto.SetLimitRequest
import uz.kidscard.family.api.dto.toDto
import uz.kidscard.family.domain.LimitRule
import uz.kidscard.family.domain.LimitType
import uz.kidscard.family.repository.ChildRepository
import uz.kidscard.family.repository.LimitRuleRepository
import java.time.Instant
import java.util.UUID

@Service
@Transactional
class LimitService(
    private val limitRuleRepository: LimitRuleRepository,
    private val childRepository: ChildRepository,
    private val familyService: FamilyService,
    private val outboxService: OutboxService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun setLimit(
        childId: UUID,
        familyId: UUID,
        requestingUserId: UUID,
        request: SetLimitRequest,
    ): LimitRuleDto {
        familyService.requireOwner(familyId, requestingUserId)

        val child = childRepository.findByFamilyIdAndId(familyId, childId)
            ?: throw ResourceNotFoundException("Child", childId)

        if (request.limitType == LimitType.CATEGORY && request.category.isNullOrBlank()) {
            throw BusinessException("CATEGORY_REQUIRED", "Category is required for CATEGORY limit type")
        }

        // Deactivate previous limits of the same type (and same category for CATEGORY type)
        val existing = if (request.limitType == LimitType.CATEGORY && request.category != null) {
            limitRuleRepository.findByChildIdAndLimitTypeAndCategoryAndActiveTrue(
                childId, request.limitType, request.category,
            )
        } else {
            limitRuleRepository.findByChildIdAndLimitTypeAndActiveTrue(childId, request.limitType)
        }

        existing.forEach { rule ->
            rule.active = false
            rule.updatedAt = Instant.now()
            limitRuleRepository.save(rule)
        }
        log.debug("Deactivated {} existing limit(s) for childId={} type={}", existing.size, childId, request.limitType)

        val newLimit = LimitRule(
            childId = childId,
            limitType = request.limitType,
            category = request.category,
            amountUzs = request.amountUzs,
            createdBy = requestingUserId,
        )
        val saved = limitRuleRepository.save(newLimit)

        outboxService.publish(
            aggregateType = "LimitRule",
            aggregateId = saved.id.toString(),
            eventType = "family.limit.updated",
            topic = "family.events",
            payload = mapOf(
                "limitId" to saved.id,
                "childId" to childId,
                "familyId" to familyId,
                "limitType" to saved.limitType.name,
                "category" to saved.category,
                "amountUzs" to saved.amountUzs,
                "updatedBy" to requestingUserId,
                "createdAt" to saved.createdAt,
            ),
        )

        log.info("Limit set: id={} childId={} type={} amount={}", saved.id, childId, request.limitType, request.amountUzs)
        return saved.toDto()
    }

    @Transactional(readOnly = true)
    fun getLimits(childId: UUID, familyId: UUID, requestingUserId: UUID): List<LimitRuleDto> {
        familyService.requireMember(familyId, requestingUserId)

        childRepository.findByFamilyIdAndId(familyId, childId)
            ?: throw ResourceNotFoundException("Child", childId)

        return limitRuleRepository.findByChildIdAndActiveTrue(childId).map { it.toDto() }
    }

    fun removeLimit(limitId: UUID, familyId: UUID, requestingUserId: UUID) {
        familyService.requireOwner(familyId, requestingUserId)

        val limit = limitRuleRepository.findById(limitId).orElseThrow {
            ResourceNotFoundException("LimitRule", limitId)
        }

        // Verify the limit belongs to a child in this family
        childRepository.findByFamilyIdAndId(familyId, limit.childId)
            ?: throw ResourceNotFoundException("Child", limit.childId)

        limit.active = false
        limit.updatedAt = Instant.now()
        limitRuleRepository.save(limit)

        log.info("Limit removed: id={} childId={} familyId={}", limitId, limit.childId, familyId)
    }
}
