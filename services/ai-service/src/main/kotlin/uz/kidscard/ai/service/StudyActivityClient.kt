package uz.kidscard.ai.service

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate

/**
 * Reports a completed tutor exchange to family-service so it counts toward
 * gamification (XP + activity streak). Best-effort and asynchronous: study XP is
 * a nice-to-have, so a slow or unavailable family-service must never delay or
 * fail the child's chat. family-service dedups to one study day per child.
 */
@Service
class StudyActivityClient(
    @Value("\${app.family-service.url:http://localhost:8082}") private val familyServiceUrl: String,
    private val restTemplate: RestTemplate,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Async
    fun recordStudyToday(childToken: String) {
        val url = "$familyServiceUrl/api/v1/child/study-sessions"
        try {
            val headers = HttpHeaders().apply { set("Authorization", "Bearer $childToken") }
            restTemplate.exchange(url, HttpMethod.POST, HttpEntity<Void>(headers), String::class.java)
        } catch (ex: Exception) {
            log.warn("Could not record study session: {} — XP skipped this turn", ex.message)
        }
    }
}
