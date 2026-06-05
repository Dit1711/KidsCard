package uz.kidscard.family.service

import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import uz.kidscard.common.exception.BusinessException
import uz.kidscard.common.exception.ResourceNotFoundException
import uz.kidscard.family.api.dto.ChildLocationDto
import uz.kidscard.family.api.dto.FulfillLocationRequest
import uz.kidscard.family.api.dto.LocationPingRequest
import uz.kidscard.family.api.dto.LocationRequestDto
import uz.kidscard.family.api.dto.toDto
import uz.kidscard.family.domain.ChildLocation
import uz.kidscard.family.domain.LocationKind
import uz.kidscard.family.domain.LocationRequest
import uz.kidscard.family.domain.LocationRequestStatus
import uz.kidscard.family.repository.ChildLocationRepository
import uz.kidscard.family.repository.ChildRepository
import uz.kidscard.family.repository.LocationRequestRepository
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
    private val locationRequestRepository: LocationRequestRepository,
    private val childRepository: ChildRepository,
    private val familyService: FamilyService,
    private val outboxService: OutboxService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    private val requestTtl = java.time.Duration.ofMinutes(30)

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

    // ── On-demand location requests (parent presses a button) ──

    /** Parent asks the child's app to report its current location. */
    fun createRequest(familyId: UUID, childId: UUID, requestingUserId: UUID): LocationRequestDto {
        familyService.requireMember(familyId, requestingUserId)
        childRepository.findByFamilyIdAndId(familyId, childId)
            ?: throw ResourceNotFoundException("Child", childId)
        val req = LocationRequest(familyId = familyId, childId = childId, requestedBy = requestingUserId)
        return locationRequestRepository.save(req).toDto()
    }

    /** Parent polls a request's status/result. */
    fun getRequest(familyId: UUID, requestId: UUID, requestingUserId: UUID): LocationRequestDto {
        familyService.requireMember(familyId, requestingUserId)
        val req = locationRequestRepository.findById(requestId)
            .orElseThrow { ResourceNotFoundException("LocationRequest", requestId) }
        if (req.familyId != familyId) throw ResourceNotFoundException("LocationRequest", requestId)
        expireIfStale(req)
        return req.toDto()
    }

    /** Child app: the latest still-actionable pending request, if any. */
    fun pendingForChild(childId: UUID): LocationRequestDto? {
        val req = locationRequestRepository
            .findTopByChildIdAndStatusOrderByCreatedAtDesc(childId, LocationRequestStatus.PENDING)
            ?: return null
        if (expireIfStale(req)) return null
        return req.toDto()
    }

    /** Child app fulfills a pending request with a one-shot location. */
    fun fulfillRequest(childId: UUID, requestId: UUID, body: FulfillLocationRequest): LocationRequestDto {
        val req = locationRequestRepository.findById(requestId)
            .orElseThrow { ResourceNotFoundException("LocationRequest", requestId) }
        if (req.childId != childId) throw ResourceNotFoundException("LocationRequest", requestId)
        if (expireIfStale(req)) throw BusinessException("REQUEST_EXPIRED", "Запрос устарел")
        if (req.status != LocationRequestStatus.PENDING) {
            throw BusinessException("REQUEST_NOT_PENDING", "Запрос уже обработан")
        }
        req.status = LocationRequestStatus.FULFILLED
        req.fulfilledAt = Instant.now()
        req.resultLat = body.lat
        req.resultLng = body.lng
        req.resultAccuracyM = body.accuracyM
        locationRequestRepository.save(req)
        // Also store as a map ping so the requested spot shows on the parent's map.
        childLocationRepository.save(
            ChildLocation(
                familyId = req.familyId, childId = childId,
                lat = body.lat, lng = body.lng, accuracyM = body.accuracyM,
                kind = LocationKind.REQUESTED, capturedAt = Instant.now(),
            ),
        )

        // Notify the parent that the request was answered (e.g. when the child
        // opened the app later) — so they don't have to wait on the screen.
        val childName = childRepository.findById(childId).map { it.fullName }.orElse(null)
        outboxService.publish(
            aggregateType = "LocationRequest",
            aggregateId = req.id.toString(),
            eventType = "family.location.fulfilled",
            topic = "family.events",
            payload = mapOf(
                "eventType" to "family.location.fulfilled",
                "familyId" to req.familyId,
                "childId" to childId,
                "childName" to childName,
            ),
        )
        return req.toDto()
    }

    /** Mark a PENDING request EXPIRED once it's older than the TTL. Returns true if (now) expired. */
    private fun expireIfStale(req: LocationRequest): Boolean {
        if (req.status == LocationRequestStatus.PENDING && req.createdAt.isBefore(Instant.now().minus(requestTtl))) {
            req.status = LocationRequestStatus.EXPIRED
            locationRequestRepository.save(req)
        }
        return req.status == LocationRequestStatus.EXPIRED
    }

    /** Privacy retention: purge location pings older than 90 days. Runs daily. */
    @Scheduled(initialDelay = 900_000L, fixedDelay = 86_400_000L)
    fun cleanupOldLocations() {
        val cutoff = Instant.now().minus(90, ChronoUnit.DAYS)
        val removed = childLocationRepository.deleteByCapturedAtBefore(cutoff)
        if (removed > 0) log.info("Purged {} location pings older than 90 days", removed)
    }
}
