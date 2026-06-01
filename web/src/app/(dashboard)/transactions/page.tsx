"use client";

import { useState, useEffect } from "react";
import { formatSum } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { familyService, cardService, paymentService } from "@/lib/api";
import { useFamilyStore } from "@/store/family";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TransactionsPage() {
  const qc = useQueryClient();
  const { family } = useFamilyStore();

  const [selectedCard, setSelectedCard] = useState<string>("");
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpDesc, setTopUpDesc] = useState("");
  const [showTopUp, setShowTopUp] = useState(false);

  // Cards
  const { data: cards } = useQuery({
    queryKey: ["family-cards", family?.id],
    queryFn: async () => {
      const { data } = await cardService.getByFamily(family!.id);
      return data.data;
    },
    enabled: !!family?.id,
  });

  useEffect(() => {
    if (cards && cards.length > 0 && !selectedCard) {
      setSelectedCard(cards[0].id);
    }
  }, [cards, selectedCard]);

  const { data: children } = useQuery({
    queryKey: ["family-children", family?.id],
    queryFn: async () => {
      const { data } = await familyService.getChildren(family!.id);
      return data.data;
    },
    enabled: !!family?.id,
  });

  // Balance from payment-service
  const { data: balance } = useQuery({
    queryKey: ["balance", selectedCard],
    queryFn: async () => {
      const { data } = await paymentService.getBalance(selectedCard);
      return data.data;
    },
    enabled: !!selectedCard,
    refetchInterval: 10_000,
  });

  // Transaction history
  const { data: txPage, isLoading: txLoading } = useQuery({
    queryKey: ["transactions", selectedCard],
    queryFn: async () => {
      const { data } = await paymentService.getCardTransactions(selectedCard, 0, 30);
      return data.data;
    },
    enabled: !!selectedCard,
  });

  const card = cards?.find((c) => c.id === selectedCard);
  const child = children?.find((c) => c.id === card?.childId);

  // Top-up mutation
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
      setTopUpAmount("");
      setTopUpDesc("");
      setShowTopUp(false);
    },
  });

  if (!family) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Транзакции</h1>
        <p className="text-muted-foreground">Сначала создайте семью и выдайте карту.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Транзакции</h1>

      {/* Card selector */}
      {cards && cards.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {cards.map((c) => {
            const ch = children?.find((ch) => ch.id === c.childId);
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCard(c.id)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  selectedCard === c.id
                    ? "bg-primary text-white border-primary"
                    : "border-border hover:border-primary/40"
                }`}
              >
                {ch?.fullName ?? c.maskedPan}
              </button>
            );
          })}
        </div>
      )}

      {!selectedCard && cards?.length === 0 && (
        <p className="text-muted-foreground">Карты не выданы.</p>
      )}

      {selectedCard && card && (
        <>
          {/* Balance card */}
          <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <CardContent className="pt-5 pb-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-white/70 text-xs">{card.cardType} · {card.network}</p>
                  <p className="font-semibold text-lg">{child?.fullName ?? "Ребёнок"}</p>
                  <p className="font-mono text-sm tracking-wider text-white/70">{card.maskedPan}</p>
                </div>
                <Badge
                  variant="outline"
                  className={`border-white/30 ${
                    card.status === "ACTIVE" ? "text-green-300" :
                    card.status === "FROZEN" ? "text-yellow-300" : "text-red-300"
                  }`}
                >
                  {card.status}
                </Badge>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-white/70 text-xs mb-1">Текущий баланс</p>
                  <p className="text-3xl font-bold">
                    {balance ? formatSum(balance.balanceUzs) : "—"}
                  </p>
                </div>
                {card.status === "ACTIVE" && (
                  <button
                    onClick={() => setShowTopUp(!showTopUp)}
                    className="rounded-md border border-white/50 bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
                  >
                    {showTopUp ? "Отмена" : "Пополнить"}
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top-up form */}
          {showTopUp && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Пополнение карты</CardTitle>
                <CardDescription>
                  Переводите деньги с родительского счёта
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Сумма (сум)</Label>
                  <Input
                    type="number"
                    placeholder="50000"
                    min="100"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Комментарий (необязательно)</Label>
                  <Input
                    placeholder="Карманные деньги на неделю"
                    value={topUpDesc}
                    onChange={(e) => setTopUpDesc(e.target.value)}
                  />
                </div>
                {/* Quick amounts */}
                <div className="flex gap-2 flex-wrap">
                  {[10000, 25000, 50000, 100000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setTopUpAmount(String(amt))}
                      className="px-2 py-1 text-xs border rounded hover:border-primary/50 transition-colors"
                    >
                      {formatSum(amt)}
                    </button>
                  ))}
                </div>
                {topUp.isError && (
                  <p className="text-sm text-red-500">
                    Ошибка пополнения. Проверьте сумму.
                  </p>
                )}
                <Button
                  onClick={() => topUp.mutate()}
                  disabled={!topUpAmount || parseFloat(topUpAmount) < 100 || topUp.isPending}
                  className="w-full"
                >
                  {topUp.isPending ? "Обработка..." : `Пополнить на ${topUpAmount ? formatSum(parseFloat(topUpAmount)) : "..."}`}
                </Button>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Transaction history */}
          <div>
            <h2 className="text-lg font-semibold mb-3">История операций</h2>
            {txLoading && <p className="text-muted-foreground">Загрузка...</p>}
            {txPage?.content.length === 0 && (
              <p className="text-muted-foreground text-sm">Операций ещё нет.</p>
            )}
            <div className="space-y-2">
              {txPage?.content.map((tx) => {
                const isCredit = tx.direction === "CREDIT";
                const typeLabel: Record<string, string> = {
                  TOPUP: "Пополнение",
                  PURCHASE: "Покупка",
                  REFUND: "Возврат",
                  TRANSFER: "Перевод",
                  ALLOWANCE: "Карманные деньги",
                };
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        isCredit ? "bg-green-100" : "bg-red-50"
                      }`}>
                        {isCredit ? "↓" : "↑"}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {tx.merchantName ?? typeLabel[tx.type] ?? tx.type}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold text-sm ${isCredit ? "text-green-600" : "text-foreground"}`}>
                        {isCredit ? "+" : "−"}{formatSum(tx.amountUzs)}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatSum(tx.balanceAfter)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {txPage && txPage.totalElements > txPage.content.length && (
              <p className="text-xs text-center text-muted-foreground mt-3">
                Показано {txPage.content.length} из {txPage.totalElements}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
