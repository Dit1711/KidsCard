package uz.kidscard.family.service

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.common.exception.AccessDeniedException
import uz.kidscard.common.exception.BusinessException
import uz.kidscard.common.exception.ConflictException
import uz.kidscard.common.exception.ResourceNotFoundException
import uz.kidscard.family.api.dto.FamilyDto
import uz.kidscard.family.api.dto.ParentDto
import uz.kidscard.family.api.dto.toDto
import uz.kidscard.family.domain.Family
import uz.kidscard.family.domain.Parent
import uz.kidscard.family.domain.ParentRole
import uz.kidscard.family.repository.FamilyRepository
import uz.kidscard.family.repository.ParentRepository
import java.time.Instant
import java.util.UUID

@Service
@Transactional
class FamilyService(
    private val familyRepository: FamilyRepository,
    private val parentRepository: ParentRepository,
    private val outboxService: OutboxService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun createFamily(
        ownerUserId: UUID,
        ownerPhone: String,
        ownerFullName: String,
        familyName: String,
    ): FamilyDto {
        val existing = parentRepository.findByUserId(ownerUserId)
        if (existing != null) {
            throw ConflictException("FAMILY_ALREADY_EXISTS", "User already belongs to a family")
        }

        val family = Family(name = familyName)
        val saved = familyRepository.save(family)

        val owner = Parent(
            family = saved,
            role = ParentRole.OWNER,
            userId = ownerUserId,
            phone = ownerPhone,
            fullName = ownerFullName,
        )
        parentRepository.save(owner)

        outboxService.publish(
            aggregateType = "Family",
            aggregateId = saved.id.toString(),
            eventType = "family.family.created",
            topic = "family.events",
            payload = mapOf(
                "familyId" to saved.id,
                "ownerUserId" to ownerUserId,
                "familyName" to familyName,
                "createdAt" to saved.createdAt,
            ),
        )

        log.info("Family created: id={} ownerUserId={}", saved.id, ownerUserId)

        // Re-fetch with parents initialised
        val result = familyRepository.findById(saved.id).orElseThrow {
            ResourceNotFoundException("Family", saved.id)
        }
        result.parents.size // force lazy load within transaction
        return result.toDto()
    }

    @Transactional(readOnly = true)
    fun getMyFamily(requestingUserId: UUID): FamilyDto {
        val parent = parentRepository.findByUserId(requestingUserId)
            ?: throw ResourceNotFoundException("Family", requestingUserId)
        val family = familyRepository.findById(parent.family.id).orElseThrow {
            ResourceNotFoundException("Family", parent.family.id)
        }
        family.parents.size // force lazy load within transaction
        return family.toDto()
    }

    @Transactional(readOnly = true)
    fun getFamily(familyId: UUID, requestingUserId: UUID): FamilyDto {
        val family = familyRepository.findById(familyId).orElseThrow {
            ResourceNotFoundException("Family", familyId)
        }
        requireMember(familyId, requestingUserId)
        family.parents.size // force lazy load within transaction
        return family.toDto()
    }

    fun addCoParent(
        familyId: UUID,
        requestingUserId: UUID,
        coParentUserId: UUID,
        phone: String,
        fullName: String,
    ): ParentDto {
        requireOwner(familyId, requestingUserId)

        val family = familyRepository.findById(familyId).orElseThrow {
            ResourceNotFoundException("Family", familyId)
        }

        val alreadyMember = parentRepository.existsByFamilyIdAndUserId(familyId, coParentUserId)
        if (alreadyMember) {
            throw ConflictException("CO_PARENT_ALREADY_EXISTS", "User is already a member of this family")
        }

        val alreadyInAnotherFamily = parentRepository.findByUserId(coParentUserId)
        if (alreadyInAnotherFamily != null) {
            throw ConflictException("USER_IN_ANOTHER_FAMILY", "User already belongs to another family")
        }

        val coParent = Parent(
            family = family,
            role = ParentRole.CO_PARENT,
            userId = coParentUserId,
            phone = phone,
            fullName = fullName,
        )
        val saved = parentRepository.save(coParent)

        outboxService.publish(
            aggregateType = "Family",
            aggregateId = familyId.toString(),
            eventType = "family.co_parent.added",
            topic = "family.events",
            payload = mapOf(
                "familyId" to familyId,
                "coParentUserId" to coParentUserId,
                "addedBy" to requestingUserId,
                "createdAt" to saved.createdAt,
            ),
        )

        log.info("Co-parent added: familyId={} coParentUserId={}", familyId, coParentUserId)
        return saved.toDto()
    }

    fun requireMember(familyId: UUID, userId: UUID) {
        if (!parentRepository.existsByFamilyIdAndUserId(familyId, userId)) {
            throw AccessDeniedException("User is not a member of this family")
        }
    }

    fun requireOwner(familyId: UUID, userId: UUID) {
        val parent = parentRepository.findByFamilyIdAndUserId(familyId, userId)
            ?: throw AccessDeniedException("User is not a member of this family")
        if (parent.role != ParentRole.OWNER) {
            throw AccessDeniedException("Only family owner can perform this action")
        }
    }
}
