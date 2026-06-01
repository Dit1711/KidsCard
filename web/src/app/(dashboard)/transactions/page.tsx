"use client";

import { useState, useEffect } from "react";
import { formatSum } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { familyService, cardService, paymentService } from "@/lib/api";
import { useFamilyStore } from "@/store/family";
import { Panel, DInput, DLabel, DButton, Pill } from "@/components/dark";
import { CardSurface } from "@/components/CardSurface";
import { MotionStagger, MotionItem } from "@/components/motion";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

const typeLabel: Record<string, string> = {
  TOPUP: "Пополнение", PURCHASE: "Покупка", REFUND: "Возврат",
  TRANSFER: "Перевод", ALLOWANCE: "Карманные деньги",
};

export default function TransactionsPage() {
  const qc = useQueryClient();
  const { family } = useFamilyStore();

  const [selectedCard, setSelectedCard] = useState<string>("");
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpDesc, setTopUpDesc] = useState("");
  const [showTopUp, setShowTopUp] = useState(false);

  const { data: cards } = useQuery({
    queryKey: ["family-cards", family?.id],
    queryFn: async () => (await cardService.getByFamily(family!.id)).data.data,
    enabled: !!family?.id,
  });

  useEffect(() => {
    if (cards && cards.length > 0 && !selectedCard) setSelectedCard(cards[0].id);
  }, [cards, selectedCard]);

  const { data: children } = useQuery({
    queryKey: ["family-children", family?.id],
    queryFn: async () => (await familyService.getChildren(family!.id)).data.data,
    enabled: !!family?.id,
  });

  const { data: balance } = useQuery({
    queryKey: ["balance", selectedCard],
    queryFn: async () => (await paymentService.getBalance(selectedCard)).data.data,
    enabled: !!selectedCard,
    refetchInterval: 10_000,
  });

  const { data: txPage, isLoading: txLoading } = useQuery({
    queryKey: ["transactions", selectedCard],
    queryFn: async () => (await paymentService.getCardTransactions(selectedCard, 0, 30)).data.data,
    enabled: !!selectedCard,
  });

  const card = cards?.find((c) => c.id === selectedCard);
  const child = children?.find((c) => c.id === card?.childId);

  const topUp = useMutation({
    mutationFn: () =>
      paymentService.topUp({
        cardId: selectedCard,
        childId: card!.childId,
        familyId: family!.id,
        amountUzs: Math.round(parseFloat(topUpAmount)),
        description: topUpDesc || "Пополнение",
        idempotencyKey: `topup-${selectedCard}-${Date.now()}`,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["balance", selectedCard] });
      qc.invalidateQueries({ queryKey: ["transactions", selectedCard] });
      setTopUpAmount(""); setTopUpDesc(""); setShowTopUp(false);
      toast.success("Карта пополнена");
    },
    onError: () => toast.error("Ошибка пополнения. Проверьте сумму."),
  });

  if (!family) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Операции</h1>
        <p className="text-white/50">Сначала создайте семью и выдайте карту.</p>
      </div>
    );
  }

  return (
    <MotionStagger className="space-y-6">
      <MotionItem>
        <h1 className="text-2xl font-bold tracking-tight">Операции</h1>
      </MotionItem>

      {cards && cards.length > 1 && (
        <MotionItem>
          <div className="flex gap-2 flex-wrap">
            {cards.map((c) => {
              const ch = children?.find((x) => x.id === c.childId);
              return (
                <Pill key={c.id} active={selectedCard === c.id} onClick={() => setSelectedCard(c.id)}>
                  {ch?.fullName ?? c.maskedPan}
                </Pill>
              );
            })}
          </div>
        </MotionItem>
      )}

      {!selectedCard && cards?.length === 0 && <p className="text-white/50">Карты не выданы.</p>}

      {selectedCard && card && (
        <>
          {/* Balance card */}
          <MotionItem>
            <CardSurface theme={card.theme} pattern={card.pattern} className="rounded-3xl text-white p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-white/60 text-xs">{card.cardType} · {card.network}</p>
                  <p className="font-semibold text-lg">{child?.fullName ?? "Ребёнок"}</p>
                  <p className="font-mono text-sm tracking-wider text-white/70">{card.maskedPan}</p>
                </div>
                <span className="text-[11px] rounded-full px-2.5 py-0.5 bg-white/15">{card.status}</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-white/60 text-xs mb-1">Текущий баланс</p>
                  <p className="text-3xl font-bold tabular-nums">{balance ? formatSum(balance.balanceUzs) : "—"}</p>
                </div>
                {card.status === "ACTIVE" && (
                  <button onClick={() => setShowTopUp(!showTopUp)}
                    className="rounded-2xl bg-white/15 hover:bg-white/25 px-4 py-2 text-sm font-medium backdrop-blur transition-colors">
                    {showTopUp ? "Отмена" : "Пополнить"}
                  </button>
                )}
              </div>
            </CardSurface>
          </MotionItem>

          {showTopUp && (
            <MotionItem>
              <Panel className="p-5 space-y-3">
                <p className="font-medium tracking-tight">Пополнение карты</p>
                <div>
                  <DLabel>Сумма (сум)</DLabel>
                  <DInput type="number" placeholder="50000" min="100" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} />
                  <div className="flex gap-2 flex-wrap mt-2">
                    {[10000, 25000, 50000, 100000].map((amt) => (
                      <button key={amt} onClick={() => setTopUpAmount(String(amt))}
                        className="px-2.5 py-1 text-xs rounded-lg bg-white/[0.05] text-white/60 hover:text-white transition-colors">
                        {formatSum(amt)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <DLabel>Комментарий (необязательно)</DLabel>
                  <DInput placeholder="Карманные на неделю" value={topUpDesc} onChange={(e) => setTopUpDesc(e.target.value)} />
                </div>
                <DButton onClick={() => topUp.mutate()} disabled={!topUpAmount || parseFloat(topUpAmount) < 100 || topUp.isPending} className="w-full">
                  {topUp.isPending ? "Обработка…" : `Пополнить на ${topUpAmount ? formatSum(parseFloat(topUpAmount)) : "…"}`}
                </DButton>
              </Panel>
            </MotionItem>
          )}

          {/* History */}
          <MotionItem>
            <h2 className="text-lg font-semibold tracking-tight mb-3">История операций</h2>
            {txLoading && <p className="text-white/50">Загрузка…</p>}
            {txPage?.content.length === 0 && <p className="text-white/40 text-sm">Операций ещё нет.</p>}
            <div className="space-y-2">
              {txPage?.content.map((tx) => {
                const isCredit = tx.direction === "CREDIT";
                return (
                  <div key={tx.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`grid h-10 w-10 place-items-center rounded-full ${isCredit ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                        {isCredit ? <ArrowDownLeft className="h-[18px] w-[18px]" /> : <ArrowUpRight className="h-[18px] w-[18px]" />}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{tx.merchantName ?? typeLabel[tx.type] ?? tx.type}</p>
                        <p className="text-xs text-white/40">{formatDate(tx.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold text-sm tabular-nums ${isCredit ? "text-emerald-300" : "text-white"}`}>
                        {isCredit ? "+" : "−"}{formatSum(tx.amountUzs)}
                      </p>
                      <p className="text-xs text-white/40 tabular-nums">{formatSum(tx.balanceAfter)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {txPage && txPage.totalElements > txPage.content.length && (
              <p className="text-xs text-center text-white/40 mt-3">
                Показано {txPage.content.length} из {txPage.totalElements}
              </p>
            )}
          </MotionItem>
        </>
      )}
    </MotionStagger>
  );
}
