package uz.kidscard.card.service

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.card.api.dto.KidsCardDto
import uz.kidscard.card.api.dto.toDto
import uz.kidscard.card.domain.CardNetwork
import uz.kidscard.card.domain.CardStatus
import uz.kidscard.card.domain.CardType
import uz.kidscard.card.domain.KidsCard
import uz.kidscard.card.repository.KidsCardRepository
import uz.kidscard.common.exception.ConflictException
import uz.kidscard.common.exception.ResourceNotFoundException
import java.time.Instant
import java.time.ZoneOffset
import java.util.UUID

@Service
class CardService(
    private val kidsCardRepository: KidsCardRepository,
    private val outboxService: OutboxService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Transactional
    fun issueCard(
        childId: UUID,
        familyId: UUID,
        cardType: CardType,
        network: CardNetwork,
        requestingUserId: UUID,
    ): KidsCardDto {
        val existing = kidsCardRepository.findByChildIdAndStatus(childId, CardStatus.ACTIVE)
        if (existing.isNotEmpty()) {
            throw ConflictException(
                "CARD_ALREADY_EXISTS",
                "Child already has an active card",
            )
        }

        val now = Instant.now()
        val expiryDate = now.atZone(ZoneOffset.UTC).plusYears(3)
        val lastFour = (1000..9999).random().toString()
        val token = UUID.randomUUID().toString()
        val maskedPan = "4149 **** **** $lastFour"

        val card = KidsCard(
            childId = childId,
            familyId = familyId,
            cardType = cardType,
            cardToken = token,
            maskedPan = maskedPan,
            expiryMonth = expiryDate.monthValue,
            expiryYear = expiryDate.year,
            network = network,
            status = CardStatus.ACTIVE,
            issuedAt = now,
        )

        val saved = kidsCardRepository.save(card)
        log.debug("Card issued: id={} childId={} familyId={}", saved.id, childId, familyId)

        outboxService.publish(
            aggregateType = "KidsCard",
            aggregateId = saved.id.toString(),
            eventType = "card.issued",
            topic = "card.events",
            payload = mapOf(
                "cardId" to saved.id,
                "childId" to childId,
                "familyId" to familyId,
                "cardType" to cardType,
                "network" to network,
                "maskedPan" to maskedPan,
                "issuedAt" to now,
                "issuedBy" to requestingUserId,
            ),
        )

        return saved.toDto()
    }

    @Transactional(readOnly = true)
    fun getCard(cardId: UUID, requestingUserId: UUID): KidsCardDto {
        val card = kidsCardRepository.findById(cardId).orElseThrow {
            ResourceNotFoundException("KidsCard", cardId)
        }
        return card.toDto()
    }

    @Transactional(readOnly = true)
    fun getCardsByFamily(familyId: UUID, requestingUserId: UUID): List<KidsCardDto> =
        kidsCardRepository.findByFamilyId(familyId).map { it.toDto() }

    @Transactional(readOnly = true)
    fun getCardsByChild(familyId: UUID, childId: UUID, requestingUserId: UUID): List<KidsCardDto> =
        kidsCardRepository.findByFamilyIdAndChildId(familyId, childId).map { it.toDto() }

    @Transactional
    fun freezeCard(cardId: UUID, parentId: UUID, familyId: UUID): KidsCardDto {
        val card = kidsCardRepository.findByIdAndFamilyId(cardId, familyId)
            ?: throw ResourceNotFoundException("KidsCard", cardId)

        if (card.status != CardStatus.ACTIVE) {
            throw ConflictException("CARD_NOT_ACTIVE", "Only ACTIVE cards can be frozen")
        }

        val now = Instant.now()
        card.status = CardStatus.FROZEN
        card.frozenBy = parentId
        card.frozenAt = now
        card.updatedAt = now

        val saved = kidsCardRepository.save(card)
        log.debug("Card frozen: id={} by={}", cardId, parentId)

        outboxService.publish(
            aggregateType = "KidsCard",
            aggregateId = cardId.toString(),
            eventType = "card.frozen",
            topic = "card.events",
            payload = mapOf(
                "cardId" to cardId,
                "familyId" to familyId,
                "frozenBy" to parentId,
                "frozenAt" to now,
            ),
        )

        return saved.toDto()
    }

    @Transactional
    fun unfreezeCard(cardId: UUID, parentId: UUID, familyId: UUID): KidsCardDto {
        val card = kidsCardRepository.findByIdAndFamilyId(cardId, familyId)
            ?: throw ResourceNotFoundException("KidsCard", cardId)

        if (card.status != CardStatus.FROZEN) {
            throw ConflictException("CARD_NOT_FROZEN", "Only FROZEN cards can be unfrozen")
        }

        val now = Instant.now()
        card.status = CardStatus.ACTIVE
        card.frozenBy = null
        card.frozenAt = null
        card.updatedAt = now

        val saved = kidsCardRepository.save(card)
        log.debug("Card unfrozen: id={} by={}", cardId, parentId)

        outboxService.publish(
            aggregateType = "KidsCard",
            aggregateId = cardId.toString(),
            eventType = "card.unfrozen",
            topic = "card.events",
            payload = mapOf(
                "cardId" to cardId,
                "familyId" to familyId,
                "unfrozenBy" to parentId,
                "unfrozenAt" to now,
            ),
        )

        return saved.toDto()
    }

    @Transactional
    fun blockCard(cardId: UUID, parentId: UUID, familyId: UUID): KidsCardDto {
        val card = kidsCardRepository.findByIdAndFamilyId(cardId, familyId)
            ?: throw ResourceNotFoundException("KidsCard", cardId)

        if (card.status != CardStatus.ACTIVE && card.status != CardStatus.FROZEN) {
            throw ConflictException("CARD_NOT_BLOCKABLE", "Only ACTIVE or FROZEN cards can be blocked")
        }

        val now = Instant.now()
        card.status = CardStatus.BLOCKED
        card.updatedAt = now

        val saved = kidsCardRepository.save(card)
        log.debug("Card blocked: id={} by={}", cardId, parentId)

        outboxService.publish(
            aggregateType = "KidsCard",
            aggregateId = cardId.toString(),
            eventType = "card.blocked",
            topic = "card.events",
            payload = mapOf(
                "cardId" to cardId,
                "familyId" to familyId,
                "blockedBy" to parentId,
                "blockedAt" to now,
            ),
        )

        return saved.toDto()
    }
}
