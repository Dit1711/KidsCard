package uz.kidscard.family.service

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.common.exception.BusinessException
import uz.kidscard.common.exception.ResourceNotFoundException
import uz.kidscard.family.api.dto.MoneyRequestDto
import uz.kidscard.family.api.dto.SetLimitRequest
import uz.kidscard.family.api.dto.toDto
import uz.kidscard.family.domain.LimitType
import uz.kidscard.family.domain.MoneyRequest
import uz.kidscard.family.domain.RequestStatus
import uz.kidscard.family.domain.RequestType
import uz.kidscard.family.repository.ChildRepository
import uz.kidscard.family.repository.MoneyRequestRepository
import java.time.Instant
import java.util.UUID

@Service
@Transactional
class MoneyRequestService(
    private val moneyRequestRepository: MoneyRequestRepository,
    private val familyService: FamilyService,
    private val childRepository: ChildRepository,
    private val outboxService: OutboxService,
    private val topUpClient: TopUpClient,
    private val limitService: LimitService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    /** Child cabinet: create a request to the parent. */
    fun childCreate(
        childId: UUID,
        familyId: UUID,
        type: RequestType,
        amountUzs: Long,
        cardId: UUID?,
        limitType: String?,
        category: String?,
        note: String?,
    ): MoneyRequestDto {
        if (amountUzs <= 0) throw BusinessException("INVALID_AMOUNT", "Сумма должна быть больше нуля")
        if (type == RequestType.TOPUP && cardId == null) {
            throw BusinessException("CARD_REQUIRED", "Для пополнения нужна карта")
        }
        if (type == RequestType.LIMIT && limitType.isNullOrBlank()) {
            throw BusinessException("LIMIT_TYPE_REQUIRED", "Укажите тип лимита")
        }

        val request = moneyRequestRepository.save(
            MoneyRequest(
                familyId = familyId,
                childId = childId,
                type = type,
                amountUzs = amountUzs,
                cardId = cardId,
                limitType = limitType,
                category = category,
                note = note?.take(255),
            ),
        )

        val childName = childRepository.findById(childId).orElse(null)?.fullName ?: "Ребёнок"
        outboxService.publish(
            aggregateType = "MoneyRequest",
            aggregateId = request.id.toString(),
            eventType = "family.money_request.created",
            topic = "family.events",
            payload = mapOf(
                "eventType" to "family.money_request.created",
                "requestId" to request.id,
                "familyId" to familyId,
                "childId" to childId,
                "childName" to childName,
                "type" to type.name,
                "amountUzs" to amountUzs,
                "limitType" to limitType,
                "note" to note,
            ),
        )

        log.info("Money request created: id={} child={} type={} amount={}", request.id, childId, type, amountUzs)
        return request.toDto()
    }

    @Transactional(readOnly = true)
    fun listForChild(childId: UUID): List<MoneyRequestDto> =
        moneyRequestRepository.findByChildIdOrderByCreatedAtDesc(childId).map { it.toDto() }

    @Transactional(readOnly = true)
    fun listForFamily(familyId: UUID, requestingUserId: UUID): List<MoneyRequestDto> {
        familyService.requireMember(familyId, requestingUserId)
        return moneyRequestRepository.findByFamilyIdOrderByCreatedAtDesc(familyId).map { it.toDto() }
    }

    /** Parent approves: the effect (top-up / limit) is applied here, server-side. */
    fun approve(requestId: UUID, familyId: UUID, requestingUserId: UUID, token: String): MoneyRequestDto {
        familyService.requireOwner(familyId, requestingUserId)
        val request = loadPending(requestId, familyId)

        when (request.type) {
            RequestType.TOPUP -> {
                val cardId = request.cardId
                    ?: throw BusinessException("CARD_REQUIRED", "У запроса нет карты")
                topUpClient.topUp(cardId, request.childId, familyId, request.amountUzs, request.id, token)
            }
            RequestType.LIMIT -> {
                limitService.setLimit(
                    request.childId, familyId, requestingUserId,
                    SetLimitRequest(
                        limitType = LimitType.valueOf(request.limitType ?: "DAILY"),
                        category = request.category,
                        amountUzs = request.amountUzs,
                    ),
                )
            }
        }

        request.status = RequestStatus.APPROVED
        request.resolvedAt = Instant.now()
        request.resolvedBy = requestingUserId
        log.info("Money request approved: id={} type={} by={}", requestId, request.type, requestingUserId)
        return moneyRequestRepository.save(request).toDto()
    }

    fun decline(requestId: UUID, familyId: UUID, requestingUserId: UUID): MoneyRequestDto {
        familyService.requireOwner(familyId, requestingUserId)
        val request = loadPending(requestId, familyId)
        request.status = RequestStatus.DECLINED
        request.resolvedAt = Instant.now()
        request.resolvedBy = requestingUserId
        log.info("Money request declined: id={} by={}", requestId, requestingUserId)
        return moneyRequestRepository.save(request).toDto()
    }

    private fun loadPending(requestId: UUID, familyId: UUID): MoneyRequest {
        val request = moneyRequestRepository.findById(requestId).orElseThrow {
            ResourceNotFoundException("MoneyRequest", requestId)
        }
        if (request.familyId != familyId) throw ResourceNotFoundException("MoneyRequest", requestId)
        if (request.status != RequestStatus.PENDING) {
            throw BusinessException("ALREADY_RESOLVED", "Запрос уже обработан")
        }
        return request
    }
}
