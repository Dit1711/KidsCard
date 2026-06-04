package uz.kidscard.compliance

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.autoconfigure.domain.EntityScan
import org.springframework.boot.runApplication

// Pure consumer over Kafka events + a compliance read API. Only scans its own
// entities (common's OutboxEvent has no table in the compliance schema).
@SpringBootApplication
@EntityScan(basePackages = ["uz.kidscard.compliance"])
class ComplianceServiceApplication

fun main(args: Array<String>) {
    runApplication<ComplianceServiceApplication>(*args)
}
