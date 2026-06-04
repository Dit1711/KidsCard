package uz.kidscard.family.config

import org.springframework.boot.web.client.RestTemplateBuilder
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.client.SimpleClientHttpRequestFactory
import org.springframework.web.client.RestTemplate
import java.time.Duration

/**
 * The shared RestTemplate for internal service-to-service calls.
 *
 * Built through [RestTemplateBuilder] (not `new RestTemplate()`) so Spring Boot
 * applies its observation customizer — that is what records client HTTP metrics
 * AND propagates the W3C trace context (`traceparent`) downstream, stitching
 * calls into a single distributed trace. The request factory is then overridden
 * with the same bounded connect/read timeouts as before so a hung peer can never
 * tie up caller threads (also the precondition for the resilience aspects).
 */
@Configuration
class InterServiceHttpConfig {

    @Bean
    fun interServiceRestTemplate(builder: RestTemplateBuilder): RestTemplate {
        val restTemplate = builder.build()
        restTemplate.requestFactory = SimpleClientHttpRequestFactory().apply {
            setConnectTimeout(Duration.ofSeconds(2))
            setReadTimeout(Duration.ofSeconds(3))
        }
        return restTemplate
    }
}
