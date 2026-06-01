"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  familyService,
  cardService,
  analyticsService,
  choreService,
  parentSavingsService,
} from "@/lib/api";
import { useFamilyStore } from "@/store/family";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatSum(uzs: number) {
  return new Intl.NumberFormat("ru-UZ").format(uzs) + " сум";
}

const CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
  "5814": { label: "Еда", icon: "🍔", color: "#f97316" },
  "5816": { label: "Игры", icon: "🎮", color: "#8b5cf6" },
  "5945": { label: "Игрушки", icon: "🧸", color: "#ec4899" },
  "5999": { label: "Другое", icon: "🛒", color: "#3b82f6" },
  "0000": { label: "Прочее", icon: "•", color: "#94a3b8" },
};
function cat(mcc: string) {
  return CATEGORIES[mcc] ?? { label: `MCC ${mcc}`, icon: "•", color: "#94a3b8" };
}

const PERIODS = [
  { days: 7, label: "Неделя" },
  { days: 30, label: "Месяц" },
  { days: 90, label: "3 месяца" },
];

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

  const card = useMemo(
    () => cards?.find((c) => c.childId === selectedChild),
    [cards, selectedChild]
  );

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
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Аналитика</h1>
        <p className="text-gray-400">Сначала создайте семью.</p>
      </div>
    );
  }

  const childChores = chores?.filter((c) => c.childId === selectedChild) ?? [];
  const childGoals = goals?.filter((g) => g.childId === selectedChild) ?? [];
  const choresDone = childChores.filter((c) => c.status === "APPROVED").length;
  const choresPending = childChores.filter((c) => c.status === "DONE").length;
  const choresOpen = childChores.filter((c) => c.status === "PENDING").length;

  const total = analytics?.totalSpentUzs ?? 0;
  const maxDay = Math.max(1, ...(analytics?.byDay.map((d) => d.amountUzs) ?? [0]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Аналитика</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Траты, накопления и задания ребёнка
        </p>
      </div>

      {/* Child selector */}
      {children && children.length > 0 ? (
        <div className="flex gap-2 flex-wrap">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedChild(c.id)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedChild === c.id
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "border-gray-200 hover:border-indigo-300"
              }`}
            >
              {c.fullName}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-sm">Сначала добавьте детей в разделе «Семья».</p>
      )}

      {!card && selectedChild && (
        <p className="text-gray-400 text-sm">У ребёнка пока нет карты.</p>
      )}

      {card && (
        <>
          {/* Period toggle */}
          <div className="flex gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setDays(p.days)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  days === p.days
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "border-gray-200 hover:border-indigo-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spend by category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Траты по категориям</CardTitle>
                <CardDescription>Всего за период: {formatSum(total)}</CardDescription>
              </CardHeader>
              <CardContent>
                {total === 0 ? (
                  <p className="text-sm text-gray-400">Покупок за период не было</p>
                ) : (
                  <div className="space-y-3">
                    {analytics?.byCategory.map((c) => {
                      const meta = cat(c.mcc);
                      const pct = Math.round((c.amountUzs / total) * 100);
                      return (
                        <div key={c.mcc}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700">
                              {meta.icon} {meta.label}
                            </span>
                            <span className="text-gray-500">
                              {formatSum(c.amountUzs)} · {pct}%
                            </span>
                          </div>
                          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: meta.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Daily spend chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Динамика трат</CardTitle>
                <CardDescription>По дням за выбранный период</CardDescription>
              </CardHeader>
              <CardContent>
                {total === 0 ? (
                  <p className="text-sm text-gray-400">Нет данных</p>
                ) : (
                  <div className="flex items-end gap-[2px] h-32">
                    {analytics?.byDay.map((d) => {
                      const h = Math.round((d.amountUzs / maxDay) * 100);
                      return (
                        <div
                          key={d.date}
                          className="flex-1 bg-indigo-200 rounded-t hover:bg-indigo-400 transition-colors"
                          style={{ height: `${Math.max(2, h)}%` }}
                          title={`${d.date}: ${formatSum(d.amountUzs)}`}
                        />
                      );
                    })}
                  </div>
                )}
                {analytics && analytics.byDay.length > 0 && (
                  <div className="flex justify-between text-[11px] text-gray-400 mt-2">
                    <span>{analytics.byDay[0].date.slice(5)}</span>
                    <span>{analytics.byDay[analytics.byDay.length - 1].date.slice(5)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Savings goals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Накопления</CardTitle>
                <CardDescription>Прогресс по целям</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {childGoals.length === 0 && (
                  <p className="text-sm text-gray-400">Целей пока нет</p>
                )}
                {childGoals.map((g) => {
                  const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
                  const done = g.status === "COMPLETED";
                  return (
                    <div key={g.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">
                          {done ? "🎉 " : ""}{g.title}
                        </span>
                        <span className="text-gray-500">
                          {formatSum(g.currentAmount)} / {formatSum(g.targetAmount)}
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${done ? "bg-green-500" : "bg-purple-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {g.interestEarned > 0 && (
                        <p className="text-[11px] text-green-600 mt-1">
                          📈 заработано на процентах: {formatSum(g.interestEarned)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Chores summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Задания</CardTitle>
                <CardDescription>Активность ребёнка</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-gray-50 py-4">
                    <p className="text-2xl font-bold text-gray-700">{choresOpen}</p>
                    <p className="text-xs text-gray-400 mt-1">К выполнению</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 py-4">
                    <p className="text-2xl font-bold text-amber-600">{choresPending}</p>
                    <p className="text-xs text-gray-400 mt-1">На проверке</p>
                  </div>
                  <div className="rounded-xl bg-green-50 py-4">
                    <p className="text-2xl font-bold text-green-600">{choresDone}</p>
                    <p className="text-xs text-gray-400 mt-1">Выполнено</p>
                  </div>
                </div>
                {childChores.length > 0 && (
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    Заработано на заданиях:{" "}
                    {formatSum(
                      childChores
                        .filter((c) => c.status === "APPROVED")
                        .reduce((s, c) => s + c.rewardAmount, 0)
                    )}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
