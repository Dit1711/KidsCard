package uz.kidscard.card

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
class CardServiceApplication

fun main(args: Array<String>) {
    runApplication<CardServiceApplication>(*args)
}
