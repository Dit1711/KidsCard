package uz.kidscard.payment.service

import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.data.domain.PageRequest
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.containers.PostgreSQLContainer
import uz.kidscard.common.exception.BusinessException
import uz.kidscard.payment.api.dto.PayoutRequest
import uz.kidscard.payment.api.dto.TopUpRequest
import uz.kidscard.payment.api.dto.TransferRequest
import uz.kidscard.payment.domain.Direction
import uz.kidscard.payment.domain.TransactionType
import uz.kidscard.payment.repository.LedgerEntryRepository
import uz.kidscard.payment.repository.OutboxEventRepository
import uz.kidscard.payment.repository.TransactionRepository
import java.util.UUID

/**
 * Integration tests for the money paths against a real Postgres (Testcontainers)
 * with the production Flyway schema. The double-entry ledger + transfer/payout
 * logic is the highest-risk surface, so it gets the first safety net.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class LedgerTransactionTest {

    @Autowired lateinit var transactionRepository: TransactionRepository
    @Autowired lateinit var ledgerEntryRepository: LedgerEntryRepository
    @Autowired lateinit var outboxEventRepository: OutboxEventRepository

    private val mapper = jacksonObjectMapper().registerModule(JavaTimeModule())

    @Suppress("UNCHECKED_CAST")
    private fun service(): TransactionService {
        val kafka = mock(KafkaTemplate::class.java) as KafkaTemplate<String, String>
        val outbox = OutboxService(outboxEventRepository, kafka, mapper)
        val limitCheck = mock(LimitCheckService::class.java)
        return TransactionService(transactionRepository, ledgerEntryRepository, limitCheck, outbox)
    }

    private fun balance(card: UUID) = ledgerEntryRepository.computeBalance(card.toString())

    private fun fund(svc: TransactionService, card: UUID, amount: Long) =
        svc.topUp(TopUpRequest(card, UUID.randomUUID(), UUID.randomUUID(), amount, "seed", "seed-${UUID.randomUUID()}"))

    // ── top-up ────────────────────────────────────────────────────────────────

    @Test
    fun `top-up credits the card balance`() {
        val svc = service()
        val card = UUID.randomUUID()
        val r = svc.topUp(TopUpRequest(card, UUID.randomUUID(), UUID.randomUUID(), 50_000, null, "k1"))
        assertThat(r.balanceAfter).isEqualTo(50_000)
        assertThat(balance(card)).isEqualTo(50_000)
    }

    @Test
    fun `top-ups accumulate`() {
        val svc = service()
        val card = UUID.randomUUID()
        fund(svc, card, 30_000)
        fund(svc, card, 20_000)
        assertThat(balance(card)).isEqualTo(50_000)
    }

    @Test
    fun `top-up is idempotent on replay`() {
        val svc = service()
        val card = UUID.randomUUID()
        val req = TopUpRequest(card, UUID.randomUUID(), UUID.randomUUID(), 10_000, null, "dup-key")
        svc.topUp(req)
        svc.topUp(req) // replay — must not double-credit
        assertThat(balance(card)).isEqualTo(10_000)
    }

    // ── transfer (card → card) ─────────────────────────────────────────────────

    @Test
    fun `transfer moves funds between cards`() {
        val svc = service()
        val from = UUID.randomUUID(); val to = UUID.randomUUID()
        fund(svc, from, 100_000)
        svc.transfer(TransferRequest(from, to, UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), 40_000, null, "t1"))
        assertThat(balance(from)).isEqualTo(60_000)
        assertThat(balance(to)).isEqualTo(40_000)
    }

    @Test
    fun `transfer records a TRANSFER transaction on each card`() {
        val svc = service()
        val from = UUID.randomUUID(); val to = UUID.randomUUID()
        fund(svc, from, 100_000)
        svc.transfer(TransferRequest(from, to, UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), 25_000, null, "t2"))
        val out = transactionRepository.findByCardIdOrderByCreatedAtDesc(from, PageRequest.of(0, 10))
            .content.first { it.type == TransactionType.TRANSFER }
        val into = transactionRepository.findByCardIdOrderByCreatedAtDesc(to, PageRequest.of(0, 10))
            .content.first { it.type == TransactionType.TRANSFER }
        assertThat(out.direction).isEqualTo(Direction.DEBIT)
        assertThat(into.direction).isEqualTo(Direction.CREDIT)
    }

    @Test
    fun `transfer with insufficient funds is rejected and leaves balances untouched`() {
        val svc = service()
        val from = UUID.randomUUID(); val to = UUID.randomUUID()
        fund(svc, from, 10_000)
        assertThatThrownBy {
            svc.transfer(TransferRequest(from, to, UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), 50_000, null, "t3"))
        }.isInstanceOf(BusinessException::class.java).extracting("code").isEqualTo("INSUFFICIENT_FUNDS")
        assertThat(balance(from)).isEqualTo(10_000)
        assertThat(balance(to)).isEqualTo(0)
    }

    @Test
    fun `transfer to the same card is rejected`() {
        val svc = service()
        val card = UUID.randomUUID()
        fund(svc, card, 10_000)
        assertThatThrownBy {
            svc.transfer(TransferRequest(card, card, UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), 5_000, null, "t4"))
        }.isInstanceOf(IllegalArgumentException::class.java)
    }

    @Test
    fun `transfer is idempotent on replay`() {
        val svc = service()
        val from = UUID.randomUUID(); val to = UUID.randomUUID()
        fund(svc, from, 100_000)
        val req = TransferRequest(from, to, UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), 30_000, null, "t-dup")
        svc.transfer(req)
        svc.transfer(req) // replay
        assertThat(balance(from)).isEqualTo(70_000)
        assertThat(balance(to)).isEqualTo(30_000)
    }

    // ── payout (card → bank account) ───────────────────────────────────────────

    @Test
    fun `payout debits the card and emits a payout event`() {
        val svc = service()
        val card = UUID.randomUUID()
        fund(svc, card, 100_000)
        svc.payout(PayoutRequest(card, UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), 50_000, null, "p1"))
        assertThat(balance(card)).isEqualTo(50_000)
        assertThat(outboxEventRepository.findAll()).anyMatch { it.eventType == "payment.payout.completed" }
    }

    @Test
    fun `payout with insufficient funds is rejected`() {
        val svc = service()
        val card = UUID.randomUUID()
        fund(svc, card, 10_000)
        assertThatThrownBy {
            svc.payout(PayoutRequest(card, UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), 50_000, null, "p2"))
        }.isInstanceOf(BusinessException::class.java).extracting("code").isEqualTo("INSUFFICIENT_FUNDS")
        assertThat(balance(card)).isEqualTo(10_000)
    }

    companion object {
        // Prefer an external Postgres when one is provided via env — the CI workflow
        // exposes a service container through SPRING_DATASOURCE_URL, and a local run
        // can point at docker-compose via TEST_DB_URL (handy when the local Docker
        // engine is incompatible with Testcontainers' client API version).
        // Otherwise spin up a throwaway Postgres via Testcontainers.
        private val externalUrl: String? = System.getenv("TEST_DB_URL") ?: System.getenv("SPRING_DATASOURCE_URL")
        private val externalUser: String = System.getenv("TEST_DB_USER") ?: System.getenv("SPRING_DATASOURCE_USERNAME") ?: "kidscard"
        private val externalPass: String = System.getenv("TEST_DB_PASS") ?: System.getenv("SPRING_DATASOURCE_PASSWORD") ?: "kidscard"

        private val postgres: PostgreSQLContainer<*>? =
            if (externalUrl == null)
                PostgreSQLContainer("postgres:17-alpine")
                    .withDatabaseName("kidscard").withUsername("kidscard").withPassword("kidscard")
            else null

        @JvmStatic
        @DynamicPropertySource
        fun props(registry: DynamicPropertyRegistry) {
            if (externalUrl != null) {
                registry.add("spring.datasource.url") { externalUrl }
                registry.add("spring.datasource.username") { externalUser }
                registry.add("spring.datasource.password") { externalPass }
            } else {
                postgres!!.start()
                registry.add("spring.datasource.url", postgres::getJdbcUrl)
                registry.add("spring.datasource.username", postgres::getUsername)
                registry.add("spring.datasource.password", postgres::getPassword)
            }
            registry.add("spring.flyway.enabled") { "true" }
            registry.add("spring.flyway.schemas") { "payment" }
            registry.add("spring.jpa.properties.hibernate.default_schema") { "payment" }
            registry.add("spring.jpa.hibernate.ddl-auto") { "validate" }
        }
    }
}
