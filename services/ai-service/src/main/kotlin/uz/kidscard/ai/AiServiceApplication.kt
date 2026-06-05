package uz.kidscard.ai

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableAsync

@SpringBootApplication
@EnableAsync
class AiServiceApplication

fun main(args: Array<String>) {
    runApplication<AiServiceApplication>(*args)
}
