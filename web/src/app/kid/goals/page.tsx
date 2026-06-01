"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { childAuthService } from "@/lib/api";
import { useChildStore } from "@/store/child";

function formatSum(uzs: number | null | undefined) {
  if (uzs == null) return "—";
  return new Intl.NumberFormat("ru-UZ").format(uzs) + " сум";
}

export default function KidGoalsPage() {
  const { isChildAuthed } = useChildStore();
  const qc = useQueryClient();

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

  const { data: goals } = useQuery({
    queryKey: ["child-goals"],
    queryFn: async () => {
      const { data } = await childAuthService.myGoals();
      return data.data;
    },
    enabled: isChildAuthed,
    refetchInterval: 20_000,
  });

  const { data: savingsRate } = useQuery({
    queryKey: ["savings-rate"],
    queryFn: async () => {
      const { data } = await childAuthService.savingsRate();
      return data.data.annualRatePercent;
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

  if (!card) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow">
        У тебя пока нет карты 🙃
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1 px-1">
        <h2 className="text-base font-bold text-purple-800">🐷 Мои цели</h2>
        <button
          onClick={() => setShowGoal(!showGoal)}
          className="text-sm text-purple-600 font-medium"
        >
          {showGoal ? "Отмена" : "+ Новая цель"}
        </button>
      </div>
      {savingsRate != null && (
        <p className="px-1 mb-3 text-xs text-gray-400">
          На накопления капает процент 🌱
        </p>
      )}

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
              <div className="h-3 rounded-full bg-purple-100 overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all ${done ? "bg-green-500" : "bg-purple-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Interest on this goal */}
              {savingsRate != null && (
                <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="rounded-full bg-green-50 text-green-700 px-2 py-0.5 font-medium">
                    📈 {savingsRate}% годовых
                  </span>
                  {g.interestEarned > 0 && (
                    <span className="text-green-600">
                      заработано {formatSum(g.interestEarned)}
                    </span>
                  )}
                  <span className="text-gray-400">
                    ≈ +{formatSum(Math.round((g.currentAmount * savingsRate) / 100 / 12))}/мес
                  </span>
                </div>
              )}

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
  );
}
