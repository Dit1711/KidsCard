package uz.kidscard.family.service

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.common.exception.ResourceNotFoundException
import uz.kidscard.family.api.dto.AddChildRequest
import uz.kidscard.family.api.dto.ChildDto
import uz.kidscard.family.api.dto.UpdateChildRequest
import uz.kidscard.family.api.dto.toDto
import uz.kidscard.family.domain.Child
import uz.kidscard.family.domain.ChildStatus
import uz.kidscard.family.domain.computeAgeGroup
import uz.kidscard.family.repository.ChildRepository
import uz.kidscard.family.repository.FamilyRepository
import java.time.Instant
import java.util.UUID

@Service
@Transactional
class ChildService(
    private val childRepository: ChildRepository,
    private val familyRepository: FamilyRepository,
    private val familyService: FamilyService,
    private val outboxService: OutboxService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun addChild(
        familyId: UUID,
        requestingUserId: UUID,
        request: AddChildRequest,
    ): ChildDto {
        familyService.requireOwner(familyId, requestingUserId)

        val family = familyRepository.findById(familyId).orElseThrow {
            ResourceNotFoundException("Family", familyId)
        }

        val ageGroup = computeAgeGroup(request.dateOfBirth)

        val child = Child(
            family = family,
            fullName = request.fullName,
            dateOfBirth = request.dateOfBirth,
            ageGroup = ageGroup,
            avatarUrl = request.avatarUrl,
        )
        val saved = childRepository.save(child)

        outboxService.publish(
            aggregateType = "Child",
            aggregateId = saved.id.toString(),
            eventType = "family.child.added",
            topic = "family.events",
            payload = mapOf(
                "childId" to saved.id,
                "familyId" to familyId,
                "ageGroup" to ageGroup.name,
                "createdAt" to saved.createdAt,
            ),
        )

        log.info("Child added: id={} familyId={}", saved.id, familyId)
        return saved.toDto()
    }

    @Transactional(readOnly = true)
    fun getChildren(familyId: UUID, requestingUserId: UUID): List<ChildDto> {
        familyService.requireMember(familyId, requestingUserId)
        return childRepository.findByFamilyId(familyId).map { it.toDto() }
    }

    @Transactional(readOnly = true)
    fun getChild(childId: UUID, familyId: UUID, requestingUserId: UUID): ChildDto {
        familyService.requireMember(familyId, requestingUserId)
        val child = childRepository.findByFamilyIdAndId(familyId, childId)
            ?: throw ResourceNotFoundException("Child", childId)
        return child.toDto()
    }

    fun updateChild(
        childId: UUID,
        familyId: UUID,
        requestingUserId: UUID,
        request: UpdateChildRequest,
    ): ChildDto {
        familyService.requireOwner(familyId, requestingUserId)

        val child = childRepository.findByFamilyIdAndId(familyId, childId)
            ?: throw ResourceNotFoundException("Child", childId)

        request.fullName?.let {
            child.fullName = it
        }
        request.avatarUrl?.let {
            child.avatarUrl = it
        }
        child.updatedAt = Instant.now()

        val saved = childRepository.save(child)
        log.info("Child updated: id={} familyId={}", childId, familyId)
        return saved.toDto()
    }

    fun deactivateChild(childId: UUID, familyId: UUID, requestingUserId: UUID): ChildDto {
        familyService.requireOwner(familyId, requestingUserId)

        val child = childRepository.findByFamilyIdAndId(familyId, childId)
            ?: throw ResourceNotFoundException("Child", childId)

        child.status = ChildStatus.INACTIVE
        child.updatedAt = Instant.now()

        val saved = childRepository.save(child)
        log.info("Child deactivated: id={} familyId={}", childId, familyId)
        return saved.toDto()
    }
}
