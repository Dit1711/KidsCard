package uz.kidscard.kyc

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.autoconfigure.domain.EntityScan
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
@EntityScan(basePackages = ["uz.kidscard.kyc", "uz.kidscard.common"])
class KycServiceApplication

fun main(args: Array<String>) {
    runApplication<KycServiceApplication>(*args)
}
