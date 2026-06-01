"use client";

import { useState, useEffect, useMemo } from "react";
import { formatSum } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import {
  familyService,
  cardService,
  analyticsService,
  choreService,
  parentSavingsService,
} from "@/lib/api";
import { useFamilyStore } from "@/store/family";
import { categoryByMcc } from "@/lib/categories";
import { SpendChart } from "@/components/SpendChart";
import { MotionStagger, MotionItem } from "@/components/motion";

const PERIODS = [
  { days: 7, label: "Неделя" },
  { days: 30, label: "Месяц" },
  { days: 90, label: "3 месяца" },
];

function Pill({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active ? "bg-white/15 text-white" : "bg-white/[0.04] text-white/50 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

const panel = "rounded-3xl bg-white/[0.04] border border-white/[0.06] p-6";

export default function AnalyticsPage() {
  const { family } = useFamilyStore();
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [days, setDays] = useState(30);

  const { data: children } = useQuery({
    queryKey: ["family-children", family?.id],
    queryFn: async () => {
      const { data } = await familyService.getChildren(family!.id);
      return data.data;
    },
    enabled: !!family?.id,
  });

  useEffect(() => {
    if (children && children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  const { data: cards } = useQuery({
    queryKey: ["family-cards", family?.id],
    queryFn: async () => {
      const { data } = await cardService.getByFamily(family!.id);
      return data.data;
    },
    enabled: !!family?.id,
  });

  const card = useMemo(() => cards?.find((c) => c.childId === selectedChild), [cards, selectedChild]);

  const { data: analytics } = useQuery({
    queryKey: ["analytics", card?.id, days],
    queryFn: async () => {
      const { data } = await analyticsService.cardSpend(card!.id, days);
      return data.data;
    },
    enabled: !!card?.id,
  });

  const { data: chores } = useQuery({
    queryKey: ["chores", family?.id],
    queryFn: async () => {
      const { data } = await choreService.list(family!.id);
      return data.data;
    },
    enabled: !!family?.id,
  });

  const { data: goals } = useQuery({
    queryKey: ["parent-goals", family?.id],
    queryFn: async () => {
      const { data } = await parentSavingsService.list(family!.id);
      return data.data;
    },
    enabled: !!family?.id,
  });

  if (!family) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Аналитика</h1>
        <p className="text-white/50">Сначала создайте семью.</p>
      </div>
    );
  }

  const childChores = chores?.filter((c) => c.childId === selectedChild) ?? [];
  const childGoals = goals?.filter((g) => g.childId === selectedChild) ?? [];
  const choresDone = childChores.filter((c) => c.status === "APPROVED").length;
  const choresPending = childChores.filter((c) => c.status === "DONE").length;
  const choresOpen = childChores.filter((c) => c.status === "PENDING").length;
  const total = analytics?.totalSpentUzs ?? 0;

  return (
    <MotionStagger className="space-y-6">
      <MotionItem>
        <h1 className="text-2xl font-bold tracking-tight">Аналитика</h1>
        <p className="text-white/50 mt-1 text-sm">Траты, накопления и задания ребёнка</p>
      </MotionItem>

      {/* Child selector */}
      {children && children.length > 0 ? (
        <MotionItem>
          <div className="flex gap-2 flex-wrap">
            {children.map((c) => (
              <Pill key={c.id} active={selectedChild === c.id} onClick={() => setSelectedChild(c.id)}>
                {c.fullName}
              </Pill>
            ))}
          </div>
        </MotionItem>
      ) : (
        <p className="text-white/50 text-sm">Сначала добавьте детей в разделе «Семья».</p>
      )}

      {!card && selectedChild && <p className="text-white/50 text-sm">У ребёнка пока нет карты.</p>}

      {card && (
        <>
          <MotionItem>
            <div className="flex gap-2">
              {PERIODS.map((p) => (
                <Pill key={p.days} active={days === p.days} onClick={() => setDays(p.days)}>
                  {p.label}
                </Pill>
              ))}
            </div>
          </MotionItem>

          <MotionItem>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Spend by category */}
              <div className={panel}>
                <p className="font-medium tracking-tight">Траты по категориям</p>
                <p className="text-xs text-white/40 mb-4">Всего за период: {formatSum(total)}</p>
                {total === 0 ? (
                  <p className="text-sm text-white/40">Покупок за период не было</p>
                ) : (
                  <div className="space-y-3.5">
                    {analytics?.byCategory.map((c) => {
                      const meta = categoryByMcc(c.mcc);
                      const pct = Math.round((c.amountUzs / total) * 100);
                      return (
                        <div key={c.mcc}>
                          <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="font-medium">{meta.icon} {meta.label}</span>
                            <span className="text-white/50 tabular-nums">{formatSum(c.amountUzs)} · {pct}%</span>
                          </div>
                          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: meta.color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Daily chart */}
              <div className={panel}>
                <p className="font-medium tracking-tight">Динамика трат</p>
                <p className="text-xs text-white/40 mb-3">По дням за выбранный период</p>
                {total === 0 ? (
                  <p className="text-sm text-white/40">Нет данных</p>
                ) : (
                  <SpendChart data={analytics?.byDay ?? []} />
                )}
              </div>

              {/* Goals */}
              <div className={panel}>
                <p className="font-medium tracking-tight mb-4">Накопления</p>
                {childGoals.length === 0 ? (
                  <p className="text-sm text-white/40">Целей пока нет</p>
                ) : (
                  <div className="space-y-4">
                    {childGoals.map((g) => {
                      const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
                      const done = g.status === "COMPLETED";
                      return (
                        <div key={g.id}>
                          <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="text-white/80">{g.title}</span>
                            <span className="text-white/50 tabular-nums">{formatSum(g.currentAmount)} / {formatSum(g.targetAmount)}</span>
                          </div>
                          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                            <div className={`h-full rounded-full bg-gradient-to-r ${done ? "from-emerald-400 to-teal-400" : "from-violet-500 to-fuchsia-500"}`} style={{ width: `${pct}%` }} />
                          </div>
                          {g.interestEarned > 0 && (
                            <p className="text-[11px] text-emerald-400 mt-1">заработано на процентах: {formatSum(g.interestEarned)}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Chores summary */}
              <div className={panel}>
                <p className="font-medium tracking-tight mb-4">Задания</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl bg-white/[0.05] py-4">
                    <p className="text-2xl font-bold tabular-nums">{choresOpen}</p>
                    <p className="text-xs text-white/40 mt-1">К выполнению</p>
                  </div>
                  <div className="rounded-2xl bg-amber-500/15 py-4">
                    <p className="text-2xl font-bold text-amber-300 tabular-nums">{choresPending}</p>
                    <p className="text-xs text-white/40 mt-1">На проверке</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-500/15 py-4">
                    <p className="text-2xl font-bold text-emerald-300 tabular-nums">{choresDone}</p>
                    <p className="text-xs text-white/40 mt-1">Выполнено</p>
                  </div>
                </div>
                {childChores.length > 0 && (
                  <p className="text-xs text-white/40 mt-4 text-center">
                    Заработано на заданиях:{" "}
                    {formatSum(childChores.filter((c) => c.status === "APPROVED").reduce((s, c) => s + c.rewardAmount, 0))}
                  </p>
                )}
              </div>
            </div>
          </MotionItem>
        </>
      )}
    </MotionStagger>
  );
}
