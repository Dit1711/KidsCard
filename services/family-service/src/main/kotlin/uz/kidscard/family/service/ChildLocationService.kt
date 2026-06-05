package uz.kidscard.family.service

import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.common.exception.ResourceNotFoundException
import uz.kidscard.family.api.dto.ChildLocationDto
import uz.kidscard.family.api.dto.LocationPingRequest
import uz.kidscard.family.api.dto.toDto
import uz.kidscard.family.domain.ChildLocation
import uz.kidscard.family.repository.ChildLocationRepository
import uz.kidscard.family.repository.ChildRepository
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

/**
 * "Where's my child" — stores one-shot location pings reported by the child's
 * app (with consent) and serves them to the parent. Not continuous tracking.
 */
@Service
@Transactional
class ChildLocationService(
    private val childLocationRepository: ChildLocationRepository,
    private val childRepository: ChildRepository,
    private val familyService: FamilyService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    /** Child reports a geolocation ping (the child app owns consent). */
    fun recordPing(childId: UUID, request: LocationPingRequest): ChildLocationDto {
        val child = childRepository.findById(childId).orElseThrow { ResourceNotFoundException("Child", childId) }
        val ping = ChildLocation(
            familyId = child.family.id,
            childId = childId,
            lat = request.lat,
            lng = request.lng,
            accuracyM = request.accuracyM,
            kind = request.kind,
            label = request.label?.take(255),
            amountUzs = request.amountUzs,
            capturedAt = Instant.now(),
        )
        return childLocationRepository.save(ping).toDto()
    }

    /** Parent reads a child's recent pings (newest first). */
    @Transactional(readOnly = true)
    fun getLocations(familyId: UUID, childId: UUID, requestingUserId: UUID, sinceDays: Long): List<ChildLocationDto> {
        familyService.requireMember(familyId, requestingUserId)
        childRepository.findByFamilyIdAndId(familyId, childId)
            ?: throw ResourceNotFoundException("Child", childId)
        val since = Instant.now().minus(sinceDays.coerceIn(1, 90), ChronoUnit.DAYS)
        return childLocationRepository
            .findByChildIdAndCapturedAtAfterOrderByCapturedAtDesc(childId, since)
            .map { it.toDto() }
    }

    /** Privacy retention: purge location pings older than 90 days. Runs daily. */
    @Scheduled(initialDelay = 900_000L, fixedDelay = 86_400_000L)
    fun cleanupOldLocations() {
        val cutoff = Instant.now().minus(90, ChronoUnit.DAYS)
        val removed = childLocationRepository.deleteByCapturedAtBefore(cutoff)
        if (removed > 0) log.info("Purged {} location pings older than 90 days", removed)
    }
}
