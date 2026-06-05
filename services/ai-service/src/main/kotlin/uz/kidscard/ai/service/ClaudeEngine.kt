package uz.kidscard.ai.service

import com.anthropic.client.AnthropicClient
import com.anthropic.client.okhttp.AnthropicOkHttpClient
import com.anthropic.models.messages.MessageCreateParams
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import uz.kidscard.ai.domain.ChatRole
import kotlin.jvm.optionals.getOrNull

/** Anthropic Claude implementation of [LlmEngine] (official Java SDK). */
@Component
class ClaudeEngine(
    @Value("\${app.ai.anthropic-api-key:}") private val apiKey: String,
    @Value("\${app.ai.model}") private val model: String,
    @Value("\${app.ai.max-tokens}") private val maxTokens: Long,
) : LlmEngine {
    private val log = LoggerFactory.getLogger(javaClass)

    private val client: AnthropicClient? =
        if (apiKey.isNotBlank()) AnthropicOkHttpClient.builder().apiKey(apiKey).build()
        else { log.warn("ANTHROPIC_API_KEY is not set — AI tutor will be unavailable"); null }

    override fun complete(systemPrompt: String, history: List<LlmTurn>): String {
        val c = client ?: throw IllegalStateException("AI engine is not configured")
        val builder = MessageCreateParams.builder()
            .model(model)
            .maxTokens(maxTokens)
            .system(systemPrompt) // top-level system parameter (not a message)
        history.forEach { turn ->
            if (turn.role == ChatRole.USER) builder.addUserMessage(turn.content)
            else builder.addAssistantMessage(turn.content)
        }
        val message = client.messages().create(builder.build())
        return message.content()
            .mapNotNull { it.text().getOrNull()?.text() }
            .joinToString("\n")
            .trim()
    }
}
