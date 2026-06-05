package uz.kidscard.ai.service

import uz.kidscard.ai.domain.ChatRole

/** One turn of conversation handed to the LLM. */
data class LlmTurn(val role: ChatRole, val content: String)

/**
 * Pluggable LLM backend. Today: Anthropic Claude. Later a self-hosted engine
 * can implement this interface and be swapped in via config — nothing else in
 * the service changes.
 */
interface LlmEngine {
    /** Returns the assistant's reply for the given system prompt + conversation (oldest→newest). */
    fun complete(systemPrompt: String, history: List<LlmTurn>): String
}
