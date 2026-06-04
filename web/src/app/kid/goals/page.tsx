"use client";

import { useState } from "react";
import { formatSum } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { childAuthService } from "@/lib/api";
import { useChildStore } from "@/store/child";
import { KCard } from "@/components/kidkit";
import { PiggyBank, TrendingUp, Trophy, Plus } from "lucide-react";
import { useT } from "@/i18n/locale";

export default function KidGoalsPage() {
  const { isChildAuthed } = useChildStore();
  const t = useT();
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
      qc.invalidateQueries({ queryKey: ["child-gamification"] });
    },
  });

  if (!card) {
    return <KCard className="p-8 text-center text-white/40">{t("kidg.noCard")}</KCard>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1 px-1">
        <h2 className="text-base font-bold flex items-center gap-1.5"><PiggyBank className="h-4 w-4 text-fuchsia-300" /> {t("kidg.title")}</h2>
        <button onClick={() => setShowGoal(!showGoal)} className="text-sm text-fuchsia-300 font-medium inline-flex items-center gap-1">
          {showGoal ? t("common.cancel") : <><Plus className="h-3.5 w-3.5" /> {t("kidg.newGoal")}</>}
        </button>
      </div>
      {savingsRate != null && (
        <p className="px-1 mb-3 text-xs text-white/40">{t("kidg.interestHint")}</p>
      )}

      {showGoal && (
        <KCard className="p-4 space-y-3 mb-3">
          <input
            placeholder={t("kidg.titlePlaceholder")}
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
            className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-fuchsia-400/60"
          />
          <input
            type="number"
            placeholder={t("kidg.targetPlaceholder")}
            value={goalTarget}
            onChange={(e) => setGoalTarget(e.target.value)}
            className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-fuchsia-400/60"
          />
          <button
            onClick={() => createGoal.mutate()}
            disabled={!goalTitle || !goalTarget || createGoal.isPending}
            className="w-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {createGoal.isPending ? t("kidg.creating") : t("kidg.create")}
          </button>
        </KCard>
      )}

      {goals?.length === 0 && !showGoal && (
        <p className="text-white/40 text-sm px-1">{t("kidg.empty")}</p>
      )}

      <div className="space-y-3">
        {goals?.map((g) => {
          const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
          const done = g.status === "COMPLETED";
          return (
            <KCard key={g.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium flex items-center gap-1.5">
                  {done && <Trophy className="h-4 w-4 text-amber-400" />}{g.title}
                </p>
                <p className="text-sm text-fuchsia-300 font-semibold">
                  {formatSum(g.currentAmount)} / {formatSum(g.targetAmount)}
                </p>
              </div>
              <div className="h-3 rounded-full bg-white/10 overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all ${done ? "bg-emerald-400" : "bg-gradient-to-r from-violet-500 to-fuchsia-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {savingsRate != null && (
                <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="rounded-full bg-emerald-500/15 text-emerald-300 px-2 py-0.5 font-medium inline-flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> {t("kidg.annualRate", { rate: savingsRate })}
                  </span>
                  {g.interestEarned > 0 && (
                    <span className="text-emerald-300">{t("kidg.earned", { sum: formatSum(g.interestEarned) })}</span>
                  )}
                  <span className="text-white/40">
                    {t("kidg.perMonthEst", { sum: formatSum(Math.round((g.currentAmount * savingsRate) / 100 / 12)) })}
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
                      className="flex-1 rounded-full border border-white/15 text-white/80 text-xs py-1.5 font-medium hover:bg-white/[0.06] disabled:opacity-40"
                    >
                      +{new Intl.NumberFormat("ru-UZ").format(amt)}
                    </button>
                  ))}
                </div>
              )}
              {done && (
                <p className="text-center text-emerald-300 text-sm font-medium flex items-center justify-center gap-1.5">
                  <Trophy className="h-4 w-4" /> {t("kidg.achieved")}
                </p>
              )}
            </KCard>
          );
        })}
      </div>
    </div>
  );
}
