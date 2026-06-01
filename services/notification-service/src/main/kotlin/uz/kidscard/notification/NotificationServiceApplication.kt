package uz.kidscard.notification

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.autoconfigure.domain.EntityScan
import org.springframework.boot.runApplication

// Pure consumer: only its own entities. (Common's OutboxEvent is not used here
// and has no table in the notification schema, so it must NOT be scanned.)
@SpringBootApplication
@EntityScan(basePackages = ["uz.kidscard.notification"])
class NotificationServiceApplication

fun main(args: Array<String>) {
    runApplication<NotificationServiceApplication>(*args)
}
