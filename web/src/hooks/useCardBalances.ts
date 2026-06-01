import { useQueries } from "@tanstack/react-query";
import { paymentService } from "@/lib/api";

/**
 * Fetches the real ledger balance from payment-service for each card.
 * Returns a map cardId -> balanceUzs and a total. card-service's own
 * balanceUzs field is always 0 (the ledger is the source of truth),
 * so anything user-facing must use this hook.
 */
export function useCardBalances(cardIds: string[]) {
  const results = useQueries({
    queries: cardIds.map((cardId) => ({
      queryKey: ["balance", cardId],
      queryFn: async () => {
        const { data } = await paymentService.getBalance(cardId);
        return data.data;
      },
      enabled: !!cardId,
      staleTime: 10_000,
    })),
  });

  const byCard: Record<string, number> = {};
  let total = 0;
  let isLoading = false;

  results.forEach((r, i) => {
    if (r.isLoading) isLoading = true;
    const balance = r.data?.balanceUzs ?? 0;
    byCard[cardIds[i]] = balance;
    total += balance;
  });

  return { byCard, total, isLoading };
}
