"use client";

import { useState } from "react";
import { formatSum } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { childAuthService } from "@/lib/api";
import { useChildStore } from "@/store/child";
import { categoryLabel, PERIOD_REMAINING_LABELS } from "@/lib/categories";
import { CardSurface } from "@/components/CardSurface";
import { CARD_THEMES, CARD_PATTERNS } from "@/lib/cardThemes";

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

  const qc = useQueryClient();
  const { data: requests } = useQuery({
    queryKey: ["child-requests"],
    queryFn: async () => {
      const { data } = await childAuthService.myRequests();
      return data.data;
    },
    enabled: isChildAuthed,
    refetchInterval: 20_000,
  });

  const [showReq, setShowReq] = useState(false);
  const [reqType, setReqType] = useState<"TOPUP" | "LIMIT">("TOPUP");
  const [reqAmount, setReqAmount] = useState("");
  const [reqPeriod, setReqPeriod] = useState("DAILY");
  const [reqNote, setReqNote] = useState("");

  const [showDesign, setShowDesign] = useState(false);
  const setDesign = useMutation({
    mutationFn: ({ theme, pattern }: { theme: string; pattern: string }) =>
      childAuthService.setCardDesign(card!.id, theme, pattern),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["child-cards"] }),
  });

  const createRequest = useMutation({
    mutationFn: () =>
      childAuthService.createRequest({
        type: reqType,
        amountUzs: Math.round(parseFloat(reqAmount)),
        cardId: reqType === "TOPUP" ? card?.id : undefined,
        limitType: reqType === "LIMIT" ? reqPeriod : undefined,
        note: reqNote || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["child-requests"] });
      setReqAmount("");
      setReqNote("");
      setShowReq(false);
    },
  });

  const reqStatus: Record<string, { label: string; cls: string }> = {
    PENDING: { label: "⏳ Ждём ответа", cls: "text-amber-600" },
    APPROVED: { label: "✅ Одобрено", cls: "text-green-600" },
    DECLINED: { label: "🙅 Отклонено", cls: "text-gray-400" },
  };

  return (
    <>
      {/* Card / balance */}
      {!card && (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow">
          У тебя пока нет карты 🙃
        </div>
      )}
      {card && (
        <div>
          <CardSurface theme={card.theme} pattern={card.pattern} className="rounded-3xl text-white p-6 shadow-xl">
            <div className="flex justify-between items-start mb-8">
              <span className="text-sm text-white/80">{card.network}</span>
              <button
                onClick={() => setShowDesign(!showDesign)}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-lg"
                title="Оформление карты"
              >
                🎨
              </button>
            </div>
            <p className="text-white/70 text-xs mb-1">Мои деньги</p>
            <p className="text-4xl font-extrabold mb-6">{formatSum(balance)}</p>
            <p className="font-mono tracking-widest text-white/90">{card.maskedPan}</p>
            {card.status !== "ACTIVE" && (
              <p className="mt-3 text-xs bg-white/20 rounded-full px-3 py-1 inline-block">
                {card.status === "FROZEN" ? "❄️ Карта заморожена" : "Карта недоступна"}
              </p>
            )}
          </CardSurface>

          {showDesign && (
            <div className="bg-white rounded-2xl p-4 shadow-sm mt-3 space-y-3">
              <p className="text-sm font-bold text-purple-800">🎨 Цвет карты</p>
              <div className="grid grid-cols-4 gap-2">
                {CARD_THEMES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setDesign.mutate({ theme: t.key, pattern: card.pattern })}
                    className={`h-12 rounded-xl bg-gradient-to-br ${t.grad} ${card.theme === t.key ? "ring-2 ring-offset-2 ring-purple-500" : ""}`}
                    title={t.label}
                  />
                ))}
              </div>
              <p className="text-sm font-bold text-purple-800 pt-1">Узор</p>
              <div className="flex gap-2 flex-wrap">
                {CARD_PATTERNS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setDesign.mutate({ theme: card.theme, pattern: p.key })}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      card.pattern === p.key ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-600"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ask a parent for money or a higher limit */}
      {card && (
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-base font-bold text-purple-800">💌 Попросить у родителей</h2>
            <button
              onClick={() => setShowReq(!showReq)}
              className="text-sm text-purple-600 font-medium"
            >
              {showReq ? "Отмена" : "Попросить"}
            </button>
          </div>

          {showReq && (
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setReqType("TOPUP")}
                  className={`rounded-xl border py-2 text-sm font-medium transition-colors ${
                    reqType === "TOPUP" ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-600"
                  }`}
                >
                  💰 Пополнить
                </button>
                <button
                  onClick={() => setReqType("LIMIT")}
                  className={`rounded-xl border py-2 text-sm font-medium transition-colors ${
                    reqType === "LIMIT" ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-600"
                  }`}
                >
                  🛡️ Поднять лимит
                </button>
              </div>

              {reqType === "LIMIT" && (
                <div className="flex gap-2">
                  {[
                    { v: "DAILY", l: "День" },
                    { v: "WEEKLY", l: "Неделя" },
                    { v: "MONTHLY", l: "Месяц" },
                  ].map((p) => (
                    <button
                      key={p.v}
                      onClick={() => setReqPeriod(p.v)}
                      className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                        reqPeriod === p.v ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-600"
                      }`}
                    >
                      {p.l}
                    </button>
                  ))}
                </div>
              )}

              <input
                type="number"
                placeholder={reqType === "TOPUP" ? "Сколько денег?" : "Новый лимит (сум)"}
                value={reqAmount}
                onChange={(e) => setReqAmount(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <input
                placeholder="Зачем? (по желанию)"
                value={reqNote}
                onChange={(e) => setReqNote(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <button
                onClick={() => createRequest.mutate()}
                disabled={!reqAmount || createRequest.isPending}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-full py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {createRequest.isPending ? "Отправляем…" : "Отправить запрос 📨"}
              </button>
            </div>
          )}

          {requests && requests.length > 0 && (
            <div className="space-y-2">
              {requests.slice(0, 5).map((r) => {
                const st = reqStatus[r.status] ?? { label: r.status, cls: "" };
                return (
                  <div key={r.id} className="bg-white rounded-2xl p-3 shadow-sm flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        {r.type === "TOPUP" ? "💰 Пополнение" : "🛡️ Лимит"} · {formatSum(r.amountUzs)}
                      </p>
                      {r.note && <p className="text-xs text-gray-400 truncate">«{r.note}»</p>}
                    </div>
                    <span className={`shrink-0 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                  </div>
                );
              })}
            </div>
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
              const label =
                u.limitType === "CATEGORY"
                  ? `${categoryLabel(u.category)} (в месяц)`
                  : PERIOD_REMAINING_LABELS[u.limitType] ?? u.limitType;
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
