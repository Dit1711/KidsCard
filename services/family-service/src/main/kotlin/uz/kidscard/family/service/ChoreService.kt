package uz.kidscard.family.service

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.common.exception.BusinessException
import uz.kidscard.common.exception.ResourceNotFoundException
import uz.kidscard.family.api.dto.ChoreDto
import uz.kidscard.family.api.dto.CreateChoreRequest
import uz.kidscard.family.api.dto.toDto
import uz.kidscard.family.domain.Chore
import uz.kidscard.family.domain.ChoreStatus
import uz.kidscard.family.repository.ChildRepository
import uz.kidscard.family.repository.ChoreRepository
import java.time.Instant
import java.util.UUID

@Service
@Transactional
class ChoreService(
    private val choreRepository: ChoreRepository,
    private val childRepository: ChildRepository,
    private val familyService: FamilyService,
    private val outboxService: OutboxService,
    private val walletClient: WalletClient,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun createChore(
        familyId: UUID,
        requestingUserId: UUID,
        request: CreateChoreRequest,
        token: String,
    ): ChoreDto {
        familyService.requireOwner(familyId, requestingUserId)

        // Verify the child belongs to this family
        childRepository.findByFamilyIdAndId(familyId, request.childId)
            ?: throw ResourceNotFoundException("Child", request.childId)

        val chore = Chore(
            familyId = familyId,
            childId = request.childId,
            title = request.title,
            description = request.description,
            rewardAmount = request.rewardAmount,
            dueDate = request.dueDate,
            recurrence = request.recurrence,
        )

        // Escrow: reserve the reward in the parent wallet BEFORE creating the
        // chore. If funds are short this throws and no chore is created, so a
        // promised reward is always backed by held money.
        if (request.rewardAmount > 0) {
            walletClient.placeHold(familyId, chore.id, request.rewardAmount, token)
        }

        val saved = choreRepository.save(chore)
        log.info("Chore created: id={} familyId={} childId={} reward held={}", saved.id, familyId, request.childId, request.rewardAmount)
        return saved.toDto()
    }

    @Transactional(readOnly = true)
    fun getChores(familyId: UUID, requestingUserId: UUID, childId: UUID?, status: ChoreStatus?): List<ChoreDto> {
        familyService.requireMember(familyId, requestingUserId)
        val chores = when {
            childId != null && status != null ->
                choreRepository.findByFamilyIdAndChildIdAndStatus(familyId, childId, status)
            childId != null ->
                choreRepository.findByFamilyIdAndChildId(familyId, childId)
            status != null ->
                choreRepository.findByFamilyIdAndStatus(familyId, status)
            else ->
                choreRepository.findByFamilyId(familyId)
        }
        return chores.map { it.toDto() }
    }

    /** Child cabinet: list this child's own chores (scoped by JWT childId). */
    @Transactional(readOnly = true)
    fun getChildChores(childId: UUID): List<ChoreDto> =
        choreRepository.findByChildIdOrderByCreatedAtDesc(childId).map { it.toDto() }

    /** Child marks their own chore done (PENDING → DONE). */
    fun childCompleteChore(choreId: UUID, childId: UUID): ChoreDto {
        val chore = choreRepository.findById(choreId).orElseThrow {
            ResourceNotFoundException("Chore", choreId)
        }
        if (chore.childId != childId) {
            throw ResourceNotFoundException("Chore", choreId)
        }
        if (chore.status != ChoreStatus.PENDING) {
            throw BusinessException("INVALID_CHORE_STATUS", "Задание уже отправлено или подтверждено")
        }
        chore.status = ChoreStatus.DONE
        chore.completedAt = Instant.now()
        chore.updatedAt = Instant.now()
        val saved = choreRepository.save(chore)
        log.info("Chore completed by child: id={} childId={}", choreId, childId)
        return saved.toDto()
    }

    fun completeChore(choreId: UUID, familyId: UUID, requestingUserId: UUID): ChoreDto {
        familyService.requireMember(familyId, requestingUserId)

        val chore = choreRepository.findById(choreId).orElseThrow {
            ResourceNotFoundException("Chore", choreId)
        }

        if (chore.familyId != familyId) {
            throw ResourceNotFoundException("Chore", choreId)
        }

        if (chore.status != ChoreStatus.PENDING) {
            throw BusinessException(
                "INVALID_CHORE_STATUS",
                "Chore can only be completed when in PENDING status, current status: ${chore.status}",
            )
        }

        chore.status = ChoreStatus.DONE
        chore.completedAt = Instant.now()
        chore.updatedAt = Instant.now()

        val saved = choreRepository.save(chore)
        log.info("Chore completed: id={} familyId={}", choreId, familyId)
        return saved.toDto()
    }

    fun approveChore(choreId: UUID, familyId: UUID, requestingUserId: UUID): ChoreDto {
        familyService.requireOwner(familyId, requestingUserId)

        val chore = choreRepository.findById(choreId).orElseThrow {
            ResourceNotFoundException("Chore", choreId)
        }

        if (chore.familyId != familyId) {
            throw ResourceNotFoundException("Chore", choreId)
        }

        if (chore.status != ChoreStatus.DONE) {
            throw BusinessException(
                "INVALID_CHORE_STATUS",
                "Chore can only be approved when in DONE status, current status: ${chore.status}",
            )
        }

        chore.status = ChoreStatus.APPROVED
        chore.approvedBy = requestingUserId
        chore.approvedAt = Instant.now()
        chore.updatedAt = Instant.now()

        val saved = choreRepository.save(chore)

        outboxService.publish(
            aggregateType = "Chore",
            aggregateId = saved.id.toString(),
            eventType = "family.chore.completed",
            topic = "family.events",
            payload = mapOf(
                "eventType" to "family.chore.completed",
                "choreId" to saved.id,
                "familyId" to familyId,
                "childId" to saved.childId,
                "title" to saved.title,
                "rewardAmount" to saved.rewardAmount,
                "approvedBy" to requestingUserId,
                "approvedAt" to saved.approvedAt,
            ),
        )

        log.info("Chore approved: id={} familyId={} approvedBy={}", choreId, familyId, requestingUserId)
        return saved.toDto()
    }
}
