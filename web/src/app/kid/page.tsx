"use client";

import { useQuery } from "@tanstack/react-query";
import { childAuthService } from "@/lib/api";
import { useChildStore } from "@/store/child";

function formatSum(uzs: number | null | undefined) {
  if (uzs == null) return "—";
  return new Intl.NumberFormat("ru-UZ").format(uzs) + " сум";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

const typeMeta: Record<string, { label: string; icon: string }> = {
  TOPUP: { label: "Пополнение", icon: "💰" },
  PURCHASE: { label: "Покупка", icon: "🛒" },
  ALLOWANCE: { label: "Карманные", icon: "💸" },
  REFUND: { label: "Возврат", icon: "↩️" },
  TRANSFER: { label: "Перевод", icon: "🔁" },
};

export default function KidHomePage() {
  const { isChildAuthed } = useChildStore();

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

  const { data: limitUsage } = useQuery({
    queryKey: ["child-limit-usage", card?.id],
    queryFn: async () => {
      const { data } = await childAuthService.limitUsage(card!.id);
      return data.data;
    },
    enabled: !!card?.id,
    refetchInterval: 15_000,
  });

  return (
    <>
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

      {/* My limits — helps the child self-control and learn */}
      {limitUsage && limitUsage.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-purple-800 mb-1 px-1">🛡️ Мои лимиты</h2>
          <p className="text-xs text-gray-400 mb-3 px-1">Сколько можно ещё потратить</p>
          <div className="space-y-2">
            {limitUsage.map((u, i) => {
              const cats: Record<string, string> = {
                "5814": "🍔 Еда", "5816": "🎮 Игры", "5945": "🧸 Игрушки", "5999": "🛒 Другое",
              };
              const periods: Record<string, string> = {
                DAILY: "На сегодня", WEEKLY: "На неделю", MONTHLY: "На месяц",
              };
              const label =
                u.limitType === "CATEGORY"
                  ? `${u.category ? cats[u.category] ?? "Категория" : "Категория"} (в месяц)`
                  : periods[u.limitType] ?? u.limitType;
              const pct = u.limitUzs > 0 ? Math.min(100, Math.round((u.spentUzs / u.limitUzs) * 100)) : 0;
              const low = u.remainingUzs <= u.limitUzs * 0.15;
              return (
                <div key={i} className="bg-white rounded-2xl p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                    <span className={`text-xs font-semibold ${low ? "text-red-500" : "text-green-600"}`}>
                      осталось {formatSum(u.remainingUzs)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${low ? "bg-red-400" : "bg-green-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    потрачено {formatSum(u.spentUzs)} из {formatSum(u.limitUzs)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent transactions */}
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
    </>
  );
}
