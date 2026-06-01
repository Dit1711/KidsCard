package uz.kidscard.notification.config

import nl.martijndwars.webpush.PushService
import org.bouncycastle.jce.provider.BouncyCastleProvider
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.scheduling.annotation.EnableAsync
import java.security.Security

@Configuration
@EnableAsync
class WebPushConfig(
    @Value("\${app.push.vapid.public-key}") private val publicKey: String,
    @Value("\${app.push.vapid.private-key}") private val privateKey: String,
    @Value("\${app.push.vapid.subject}") private val subject: String,
) {
    /** The web-push client signed with our VAPID keys. */
    @Bean
    fun webPushService(): PushService {
        if (Security.getProvider("BC") == null) {
            Security.addProvider(BouncyCastleProvider())
        }
        return PushService(publicKey, privateKey, subject)
    }
}
