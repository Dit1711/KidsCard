"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { childAuthService } from "@/lib/api";
import { useChildStore } from "@/store/child";

function formatSum(uzs: number | null | undefined) {
  if (uzs == null) return "—";
  return new Intl.NumberFormat("ru-UZ").format(uzs) + " сум";
}

const CATEGORIES = [
  { label: "Еда", icon: "🍔", mcc: "5814" },
  { label: "Игры", icon: "🎮", mcc: "5816" },
  { label: "Игрушки", icon: "🧸", mcc: "5945" },
  { label: "Другое", icon: "🛒", mcc: "5999" },
];

export default function KidShopPage() {
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

  const [shopCat, setShopCat] = useState<{ label: string; icon: string; mcc: string } | null>(null);
  const [shopAmount, setShopAmount] = useState("");
  const [shopMsg, setShopMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const spend = useMutation({
    mutationFn: () =>
      childAuthService.spend(card!.id, Math.round(parseFloat(shopAmount)), shopCat!.label, shopCat!.mcc),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["child-balance", card?.id] });
      qc.invalidateQueries({ queryKey: ["child-tx", card?.id] });
      qc.invalidateQueries({ queryKey: ["child-limit-usage", card?.id] });
      setShopMsg({ ok: true, text: `Куплено! ${shopCat!.icon} ${shopCat!.label}` });
      setShopAmount("");
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: { code?: string; message?: string } } } };
      const code = e.response?.data?.error?.code;
      const text =
        code === "LIMIT_EXCEEDED"
          ? "Упс! На сегодня лимит исчерпан 🙊"
          : code === "CATEGORY_LIMIT_EXCEEDED"
          ? "На эту категорию лимит исчерпан 🙊"
          : code === "INSUFFICIENT_FUNDS"
          ? "Не хватает денег на карте 💸"
          : "Не получилось купить, попробуй ещё";
      setShopMsg({ ok: false, text });
    },
  });

  if (!card) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow">
        У тебя пока нет карты 🙃
      </div>
    );
  }
  if (card.status !== "ACTIVE") {
    return (
      <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow">
        {card.status === "FROZEN" ? "❄️ Карта заморожена" : "Карта недоступна"}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-base font-bold text-purple-800">🛍️ Магазин</h2>
        <span className="text-sm text-purple-400">{formatSum(balance)}</span>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <p className="text-sm text-gray-500">Что покупаем?</p>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.mcc}
              onClick={() => setShopCat(c)}
              className={`flex flex-col items-center gap-1 rounded-xl border py-2 transition-colors ${
                shopCat?.mcc === c.mcc
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 hover:border-purple-300"
              }`}
            >
              <span className="text-2xl">{c.icon}</span>
              <span className="text-[11px] text-gray-600">{c.label}</span>
            </button>
          ))}
        </div>
        <input
          type="number"
          placeholder="Сколько потратить?"
          value={shopAmount}
          onChange={(e) => setShopAmount(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        {shopMsg && (
          <p className={`text-sm font-medium ${shopMsg.ok ? "text-green-600" : "text-red-500"}`}>
            {shopMsg.text}
          </p>
        )}
        <button
          onClick={() => spend.mutate()}
          disabled={!shopCat || !shopAmount || spend.isPending}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-full py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {spend.isPending
            ? "Покупаем…"
            : shopCat
            ? `Купить ${shopCat.icon} за ${shopAmount ? formatSum(parseFloat(shopAmount)) : "…"}`
            : "Выбери категорию"}
        </button>
      </div>
    </div>
  );
}
