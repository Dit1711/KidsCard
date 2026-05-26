package uz.kidscard.auth.config

import com.nimbusds.jose.jwk.source.ImmutableSecret
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.annotation.web.invoke
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import org.springframework.security.web.SecurityFilterChain
import javax.crypto.spec.SecretKeySpec

@Configuration
@EnableWebSecurity
class SecurityConfig(
    @Value("\${app.jwt.secret}") private val jwtSecret: String,
) {
    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http {
            csrf { disable() }
            sessionManagement { sessionCreationPolicy = SessionCreationPolicy.STATELESS }
            authorizeHttpRequests {
                authorize("/api/v1/auth/register", permitAll)
                authorize("/api/v1/auth/register/verify", permitAll)
                authorize("/api/v1/auth/login", permitAll)
                authorize("/api/v1/auth/login/verify", permitAll)
                authorize("/api/v1/auth/refresh", permitAll)
                authorize("/actuator/health", permitAll)
                authorize("/api-docs/**", permitAll)
                authorize("/swagger-ui/**", permitAll)
                authorize("/swagger-ui.html", permitAll)
                authorize(anyRequest, authenticated)
            }
            oauth2ResourceServer {
                jwt { }
            }
        }
        return http.build()
    }

    @Bean
    fun jwtDecoder(): JwtDecoder {
        val secretBytes = jwtSecret.toByteArray(Charsets.UTF_8)
        val secretKey = SecretKeySpec(secretBytes, "HmacSHA256")
        return NimbusJwtDecoder.withSecretKey(secretKey).build()
    }

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()
}
