package uz.kidscard.common.http

import org.springframework.http.client.SimpleClientHttpRequestFactory
import org.springframework.web.client.RestTemplate
import java.time.Duration

/**
 * Builds a [RestTemplate] for internal service-to-service calls with BOUNDED
 * timeouts.
 *
 * A bare `RestTemplate()` has no connect or read timeout, so a slow or hung
 * downstream service ties up the caller's request threads indefinitely and the
 * failure cascades across the whole call chain. These defaults make calls fail
 * fast instead, which is also the precondition for retry / circuit-breaker logic
 * to behave sensibly.
 *
 * Defaults are deliberately tight for in-cluster calls (same datacenter):
 *  - connect: 2s  — establishing the TCP connection should be near-instant.
 *  - read:    3s  — a healthy peer responds well under this; slower means trouble.
 */
fun internalRestTemplate(
    connectTimeout: Duration = Duration.ofSeconds(2),
    readTimeout: Duration = Duration.ofSeconds(3),
): RestTemplate {
    val factory = SimpleClientHttpRequestFactory().apply {
        setConnectTimeout(connectTimeout)
        setReadTimeout(readTimeout)
    }
    return RestTemplate(factory)
}
