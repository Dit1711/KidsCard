package uz.kidscard.family.service

import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.common.exception.BusinessException
import uz.kidscard.common.exception.ResourceNotFoundException
import uz.kidscard.family.api.dto.ChoreDto
import uz.kidscard.family.api.dto.CreateChoreRequest
import uz.kidscard.family.api.dto.toDto
import uz.kidscard.family.domain.Chore
import uz.kidscard.family.domain.ChoreStatus
import uz.kidscard.family.domain.Recurrence
import uz.kidscard.family.repository.ChildRepository
import uz.kidscard.family.repository.ChoreRepository
import uz.kidscard.family.service.storage.ProofStorage
import java.time.Instant
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.util.UUID

/** A proof photo on its way into storage (raw bytes + normalized extension). */
data class ProofUpload(val bytes: ByteArray, val ext: String)

/** A proof photo on its way out to a client (raw bytes + content type). */
data class ProofImage(val bytes: ByteArray, val contentType: String)

@Service
@Transactional
class ChoreService(
    private val choreRepository: ChoreRepository,
    private val childRepository: ChildRepository,
    private val familyService: FamilyService,
    private val outboxService: OutboxService,
    private val walletClient: WalletClient,
    private val proofStorage: ProofStorage,
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
            requiresPhoto = request.requiresPhoto,
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

    /** Child marks their own chore done (PENDING → DONE), optionally with a proof photo. */
    fun childCompleteChore(choreId: UUID, childId: UUID, photo: ProofUpload?): ChoreDto {
        val chore = choreRepository.findById(choreId).orElseThrow {
            ResourceNotFoundException("Chore", choreId)
        }
        if (chore.childId != childId) {
            throw ResourceNotFoundException("Chore", choreId)
        }
        if (chore.status != ChoreStatus.PENDING) {
            throw BusinessException("INVALID_CHORE_STATUS", "Задание уже отправлено или подтверждено")
        }
        if (chore.requiresPhoto && photo == null) {
            throw BusinessException("PHOTO_REQUIRED", "К этому заданию нужно приложить фото")
        }
        if (photo != null) {
            val key = "chore-${chore.id}.${photo.ext}"
            proofStorage.store(key, photo.bytes)
            chore.proofPhotoKey = key
            chore.proofPhotoAt = Instant.now()
        }
        chore.status = ChoreStatus.DONE
        chore.completedAt = Instant.now()
        chore.updatedAt = Instant.now()
        val saved = choreRepository.save(chore)

        // Notify the parent that the child finished a task and it needs review.
        outboxService.publish(
            aggregateType = "Chore",
            aggregateId = saved.id.toString(),
            eventType = "family.chore.submitted",
            topic = "family.events",
            payload = mapOf(
                "eventType" to "family.chore.submitted",
                "choreId" to saved.id,
                "familyId" to saved.familyId,
                "childId" to saved.childId,
                "title" to saved.title,
                "rewardAmount" to saved.rewardAmount,
                "completedAt" to saved.completedAt,
            ),
        )

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

    fun approveChore(choreId: UUID, familyId: UUID, requestingUserId: UUID, token: String): ChoreDto {
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

        // Recurring chore: spawn the next occurrence so it keeps coming back.
        if (chore.recurrence != Recurrence.NONE) {
            spawnNext(chore, token)
        }

        log.info("Chore approved: id={} familyId={} approvedBy={}", choreId, familyId, requestingUserId)
        return saved.toDto()
    }

    /**
     * Create the next occurrence of a recurring chore (PENDING) and escrow its
     * reward. If the wallet can't cover the next reward, the chain pauses (no
     * new chore) instead of failing the approval — the parent can fund the
     * wallet and re-create it.
     */
    private fun spawnNext(prev: Chore, token: String) {
        val today = LocalDate.now()
        val base = prev.dueDate?.takeIf { it.isAfter(today) } ?: today
        val nextDue = when (prev.recurrence) {
            Recurrence.DAILY -> base.plusDays(1)
            Recurrence.WEEKLY -> base.plusWeeks(1)
            else -> return
        }

        val next = Chore(
            familyId = prev.familyId,
            childId = prev.childId,
            title = prev.title,
            description = prev.description,
            rewardAmount = prev.rewardAmount,
            dueDate = nextDue,
            recurrence = prev.recurrence,
        )

        if (prev.rewardAmount > 0) {
            try {
                walletClient.placeHold(prev.familyId, next.id, prev.rewardAmount, token)
            } catch (ex: BusinessException) {
                log.warn("Recurring chore '{}' not respawned — escrow failed: {}", prev.title, ex.message)
                return
            }
        }

        choreRepository.save(next)
        log.info("Recurring chore respawned: from={} to={} due={} recurrence={}", prev.id, next.id, nextDue, prev.recurrence)
    }

    // ── Proof photos ──

    /** Parent fetches a chore's proof photo (auth: family member). */
    @Transactional(readOnly = true)
    fun getProofPhoto(choreId: UUID, familyId: UUID, requestingUserId: UUID): ProofImage? {
        familyService.requireMember(familyId, requestingUserId)
        val chore = choreRepository.findById(choreId).orElseThrow { ResourceNotFoundException("Chore", choreId) }
        if (chore.familyId != familyId) throw ResourceNotFoundException("Chore", choreId)
        return loadProof(chore.proofPhotoKey)
    }

    /** Child fetches their own chore's proof photo. */
    @Transactional(readOnly = true)
    fun getChildProofPhoto(choreId: UUID, childId: UUID): ProofImage? {
        val chore = choreRepository.findById(choreId).orElseThrow { ResourceNotFoundException("Chore", choreId) }
        if (chore.childId != childId) throw ResourceNotFoundException("Chore", choreId)
        return loadProof(chore.proofPhotoKey)
    }

    private fun loadProof(key: String?): ProofImage? {
        if (key == null) return null
        val bytes = proofStorage.load(key) ?: return null
        return ProofImage(bytes, contentTypeForKey(key))
    }

    private fun contentTypeForKey(key: String): String = when (key.substringAfterLast('.').lowercase()) {
        "png" -> "image/png"
        "webp" -> "image/webp"
        "heic", "heif" -> "image/heic"
        "gif" -> "image/gif"
        else -> "image/jpeg"
    }

    /**
     * Privacy: delete proof photos ~30 days after the chore was approved. The
     * fact that it was "done with a photo" stays in history; only the image is
     * purged. Runs daily (first pass 10 min after startup).
     */
    @Scheduled(initialDelay = 600_000L, fixedDelay = 86_400_000L)
    fun cleanupOldProofPhotos() {
        val cutoff = Instant.now().minus(30, ChronoUnit.DAYS)
        val stale = choreRepository.findByStatusAndProofPhotoKeyIsNotNullAndApprovedAtBefore(ChoreStatus.APPROVED, cutoff)
        if (stale.isEmpty()) return
        stale.forEach { chore ->
            chore.proofPhotoKey?.let { runCatching { proofStorage.delete(it) } }
            chore.proofPhotoKey = null
            choreRepository.save(chore)
        }
        log.info("Purged {} chore proof photos older than 30 days", stale.size)
    }
}
