package uz.kidscard.openbanking.adapter

import org.springframework.stereotype.Component
import uz.kidscard.common.exception.ResourceNotFoundException

@Component
class BankAdapterRegistry(adapters: List<BankAdapter>) {

    private val registry: Map<String, BankAdapter> = adapters.associateBy { it.bankCode }

    fun get(bankCode: String): BankAdapter =
        registry[bankCode] ?: throw ResourceNotFoundException("BankAdapter", bankCode)

    fun supportedBanks(): Set<String> = registry.keys
}
