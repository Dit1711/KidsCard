package uz.kidscard.ai.config

import org.springframework.boot.web.client.RestTemplateBuilder
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.client.SimpleClientHttpRequestFactory
import org.springframework.web.client.RestTemplate
import java.time.Duration

/**
 * Shared RestTemplate for internal service-to-service calls.
 *
 * Built via [RestTemplateBuilder] so Spring Boot's observation customizer records
 * client HTTP metrics and propagates the W3C trace context downstream. Bounded
 * connect/read timeouts keep a hung peer from tying up caller threads.
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
