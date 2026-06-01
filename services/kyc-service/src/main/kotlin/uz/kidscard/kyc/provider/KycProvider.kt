package uz.kidscard.kyc.provider

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import java.math.BigDecimal

data class LivenessResult(
    val passed: Boolean,
    val similarityScore: BigDecimal,
)

/**
 * Abstraction over an external KYC/liveness provider. In production this would
 * call a real vendor (document OCR + face match). The mock implementation
 * auto-approves so the onboarding flow can be exercised end-to-end in dev.
 */
interface KycProvider {
    val name: String
    fun verifyLiveness(videoUrl: String?): LivenessResult
}

@Component
class MockKycProvider : KycProvider {
    private val log = LoggerFactory.getLogger(javaClass)
    override val name = "mock"

    override fun verifyLiveness(videoUrl: String?): LivenessResult {
        log.info("Mock liveness check for video={} — auto-approving", videoUrl)
        return LivenessResult(passed = true, similarityScore = BigDecimal("0.9800"))
    }
}
