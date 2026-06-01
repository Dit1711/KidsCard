package uz.kidscard.openbanking

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.autoconfigure.domain.EntityScan
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
@EntityScan(basePackages = ["uz.kidscard.openbanking", "uz.kidscard.common"])
class OpenBankingServiceApplication

fun main(args: Array<String>) {
    runApplication<OpenBankingServiceApplication>(*args)
}
