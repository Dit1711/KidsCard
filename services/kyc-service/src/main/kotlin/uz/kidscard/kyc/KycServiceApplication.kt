package uz.kidscard.kyc

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
class KycServiceApplication

fun main(args: Array<String>) {
    runApplication<KycServiceApplication>(*args)
}
