package uz.kidscard.family

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.autoconfigure.domain.EntityScan
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
@EntityScan(basePackages = ["uz.kidscard.family", "uz.kidscard.common"])
class FamilyServiceApplication

fun main(args: Array<String>) {
    runApplication<FamilyServiceApplication>(*args)
}
