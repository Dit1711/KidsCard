"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { childAuthService } from "@/lib/api";
import { useChildStore } from "@/store/child";

function formatSum(uzs: number | null | undefined) {
  if (uzs == null) return "—";
  return new Intl.NumberFormat("ru-UZ").format(uzs) + " сум";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

export default function KidCabinetPage() {
  const router = useRouter();
  const { isChildAuthed, hasHydrated, displayName, logout } = useChildStore();

  useEffect(() => {
    if (hasHydrated && !isChildAuthed) router.replace("/child-login");
  }, [hasHydrated, isChildAuthed, router]);

  const { data: cards } = useQuery({
    queryKey: ["child-cards"],
    queryFn: async () => {
      const { data } = await childAuthService.myCards();
      return data.data;
    },
    enabled: isChildAuthed,
  });

  const card = cards?.[0];

  const { data: balance } = useQuery({
    queryKey: ["child-balance", card?.id],
    queryFn: async () => {
      const { data } = await childAuthService.balance(card!.id);
      return data.data.balanceUzs;
    },
    enabled: !!card?.id,
    refetchInterval: 10_000,
  });

  const { data: txPage } = useQuery({
    queryKey: ["child-tx", card?.id],
    queryFn: async () => {
      const { data } = await childAuthService.transactions(card!.id, 20);
      return data.data;
    },
    enabled: !!card?.id,
  });

  const qc = useQueryClient();
  const { data: chores } = useQuery({
    queryKey: ["child-chores"],
    queryFn: async () => {
      const { data } = await childAuthService.myChores();
      return data.data;
    },
    enabled: isChildAuthed,
    refetchInterval: 15_000,
  });

  const completeChore = useMutation({
    mutationFn: (choreId: string) => childAuthService.completeChore(choreId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["child-chores"] }),
  });

  const { data: goals } = useQuery({
    queryKey: ["child-goals"],
    queryFn: async () => {
      const { data } = await childAuthService.myGoals();
      return data.data;
    },
    enabled: isChildAuthed,
  });

  const [showGoal, setShowGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState("");

  const createGoal = useMutation({
    mutationFn: () =>
      childAuthService.createGoal(goalTitle, Math.round(parseFloat(goalTarget))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["child-goals"] });
      setGoalTitle("");
      setGoalTarget("");
      setShowGoal(false);
    },
  });

  const depositGoal = useMutation({
    mutationFn: ({ goalId, amount }: { goalId: string; amount: number }) =>
      childAuthService.depositGoal(goalId, card!.id, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["child-goals"] });
      qc.invalidateQueries({ queryKey: ["child-balance", card?.id] });
    },
  });

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-purple-50">
        <p className="text-purple-300 animate-pulse">Загрузка…</p>
      </div>
    );
  }
  if (!isChildAuthed) return null;

  const typeMeta: Record<string, { label: string; icon: string }> = {
    TOPUP: { label: "Пополнение", icon: "💰" },
    PURCHASE: { label: "Покупка", icon: "🛒" },
    ALLOWANCE: { label: "Карманные", icon: "💸" },
    REFUND: { label: "Возврат", icon: "↩️" },
    TRANSFER: { label: "Перевод", icon: "🔁" },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-100 to-pink-50">
      {/* Header */}
      <header className="px-5 pt-6 pb-2 flex items-center justify-between">
        <div>
          <p className="text-sm text-purple-400">Привет,</p>
          <p className="text-xl font-bold text-purple-800">{displayName ?? "друг"}! 👋</p>
        </div>
        <button
          onClick={() => { logout(); router.replace("/child-login"); }}
          className="text-sm text-purple-400 hover:text-purple-600"
        >
          Выйти
        </button>
      </header>

      <main className="px-5 pb-10 max-w-md mx-auto space-y-6">
        {/* Card / balance */}
        {!card && (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow">
            У тебя пока нет карты 🙃
          </div>
        )}
        {card && (
          <div className="rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 text-white p-6 shadow-xl">
            <div className="flex justify-between items-start mb-8">
              <span className="text-sm text-white/80">{card.network}</span>
              <span className="text-2xl">💳</span>
            </div>
            <p className="text-white/70 text-xs mb-1">Мои деньги</p>
            <p className="text-4xl font-extrabold mb-6">{formatSum(balance)}</p>
            <p className="font-mono tracking-widest text-white/90">{card.maskedPan}</p>
            {card.status !== "ACTIVE" && (
              <p className="mt-3 text-xs bg-white/20 rounded-full px-3 py-1 inline-block">
                {card.status === "FROZEN" ? "❄️ Карта заморожена" : "Карта недоступна"}
              </p>
            )}
          </div>
        )}

        {/* Chores */}
        {chores && chores.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-purple-800 mb-3 px-1">🎯 Мои задания</h2>
            <div className="space-y-2">
              {chores
                .filter((c) => c.status !== "REJECTED")
                .map((c) => {
                  const meta: Record<string, { label: string; cls: string }> = {
                    PENDING: { label: "Выполнить", cls: "" },
                    DONE: { label: "На проверке ⏳", cls: "text-amber-600" },
                    APPROVED: { label: "Готово ✅", cls: "text-green-600" },
                  };
                  const m = meta[c.status] ?? { label: c.status, cls: "" };
                  return (
                    <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{c.title}</p>
                        <p className="text-sm text-purple-600 font-semibold">
                          +{formatSum(c.rewardAmount)}
                        </p>
                      </div>
                      {c.status === "PENDING" ? (
                        <button
                          onClick={() => completeChore.mutate(c.id)}
                          disabled={completeChore.isPending}
                          className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-full px-4 py-2"
                        >
                          Выполнил! 🎉
                        </button>
                      ) : (
                        <span className={`shrink-0 text-sm font-medium ${m.cls}`}>{m.label}</span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Savings goals */}
        {card && (
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-base font-bold text-purple-800">🐷 Мои цели</h2>
              <button
                onClick={() => setShowGoal(!showGoal)}
                className="text-sm text-purple-600 font-medium"
              >
                {showGoal ? "Отмена" : "+ Новая цель"}
              </button>
            </div>

            {showGoal && (
              <div className="bg-white rounded-2xl p-4 shadow-sm mb-3 space-y-3">
                <input
                  placeholder="На что копишь? (Велосипед)"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="Сколько нужно (100000)"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
                <button
                  onClick={() => createGoal.mutate()}
                  disabled={!goalTitle || !goalTarget || createGoal.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-full py-2 text-sm font-medium disabled:opacity-50"
                >
                  {createGoal.isPending ? "Создаём…" : "Создать цель 🌟"}
                </button>
              </div>
            )}

            {goals?.length === 0 && !showGoal && (
              <p className="text-gray-400 text-sm px-1">Создай цель и начни копить!</p>
            )}

            <div className="space-y-3">
              {goals?.map((g) => {
                const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
                const done = g.status === "COMPLETED";
                return (
                  <div key={g.id} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-800">
                        {done ? "🎉 " : ""}{g.title}
                      </p>
                      <p className="text-sm text-purple-600 font-semibold">
                        {formatSum(g.currentAmount)} / {formatSum(g.targetAmount)}
                      </p>
                    </div>
                    <div className="h-3 rounded-full bg-purple-100 overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full transition-all ${done ? "bg-green-500" : "bg-purple-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {!done && (
                      <div className="flex gap-2">
                        {[5000, 10000, 25000].map((amt) => (
                          <button
                            key={amt}
                            onClick={() => depositGoal.mutate({ goalId: g.id, amount: amt })}
                            disabled={depositGoal.isPending || (balance ?? 0) < amt}
                            className="flex-1 rounded-full border border-purple-200 text-purple-700 text-xs py-1.5 font-medium hover:bg-purple-50 disabled:opacity-40"
                          >
                            +{new Intl.NumberFormat("ru-UZ").format(amt)}
                          </button>
                        ))}
                      </div>
                    )}
                    {done && (
                      <p className="text-center text-green-600 text-sm font-medium">Цель достигнута! 🏆</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transactions */}
        {card && (
          <div>
            <h2 className="text-base font-bold text-purple-800 mb-3 px-1">История</h2>
            {txPage?.content.length === 0 && (
              <p className="text-gray-400 text-sm px-1">Пока операций нет</p>
            )}
            <div className="space-y-2">
              {txPage?.content.map((tx) => {
                const isCredit = tx.direction === "CREDIT";
                const meta = typeMeta[tx.type] ?? { label: tx.type, icon: "•" };
                return (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-lg">
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {tx.merchantName ?? meta.label}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(tx.createdAt)}</p>
                    </div>
                    <p className={`font-bold text-sm ${isCredit ? "text-green-600" : "text-gray-800"}`}>
                      {isCredit ? "+" : "−"}{formatSum(tx.amountUzs)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
