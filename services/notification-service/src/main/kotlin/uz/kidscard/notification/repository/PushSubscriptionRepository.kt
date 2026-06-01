package uz.kidscard.notification.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.notification.domain.PushSubscription
import java.util.UUID

interface PushSubscriptionRepository : JpaRepository<PushSubscription, UUID> {

    fun findByFamilyId(familyId: UUID): List<PushSubscription>

    fun findByEndpoint(endpoint: String): PushSubscription?

    fun deleteByEndpoint(endpoint: String)
}
