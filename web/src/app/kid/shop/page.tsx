"use client";

import { useState } from "react";
import { formatSum } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { childAuthService } from "@/lib/api";
import { useChildStore } from "@/store/child";
import { CATEGORIES, catLabel, type SpendCategory } from "@/lib/categories";
import { KCard } from "@/components/kidkit";
import { ShoppingBag, Snowflake } from "lucide-react";
import { useT } from "@/i18n/locale";

export default function KidShopPage() {
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

  const [shopCat, setShopCat] = useState<SpendCategory | null>(null);
  const [shopAmount, setShopAmount] = useState("");
  const [shopMsg, setShopMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const spend = useMutation({
    mutationFn: () =>
      childAuthService.spend(card!.id, Math.round(parseFloat(shopAmount)), shopCat!.label, shopCat!.mcc),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["child-balance", card?.id] });
      qc.invalidateQueries({ queryKey: ["child-tx", card?.id] });
      qc.invalidateQueries({ queryKey: ["child-limit-usage", card?.id] });
      setShopMsg({ ok: true, text: t("kids.bought", { cat: catLabel(shopCat!.mcc) }) });
      setShopAmount("");
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: { code?: string; message?: string } } } };
      const code = e.response?.data?.error?.code;
      const text =
        code === "LIMIT_EXCEEDED"
          ? t("kids.errLimit")
          : code === "CATEGORY_LIMIT_EXCEEDED"
          ? t("kids.errCatLimit")
          : code === "INSUFFICIENT_FUNDS"
          ? t("kids.errFunds")
          : t("kids.errGeneric");
      setShopMsg({ ok: false, text });
    },
  });

  if (!card) {
    return <KCard className="p-8 text-center text-white/40">{t("kidg.noCard")}</KCard>;
  }
  if (card.status !== "ACTIVE") {
    return (
      <KCard className="p-8 text-center text-white/40 inline-flex flex-col items-center gap-2 w-full">
        {card.status === "FROZEN" ? <><Snowflake className="h-6 w-6 text-cyan-300" /> {t("kids.frozen")}</> : t("kids.unavailable")}
      </KCard>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-base font-bold flex items-center gap-1.5"><ShoppingBag className="h-4 w-4 text-fuchsia-300" /> {t("kid.nav.spending")}</h2>
        <span className="text-sm text-white/60 tabular-nums">{formatSum(balance)}</span>
      </div>

      <KCard className="p-4 space-y-3">
        <p className="text-sm text-white/50">{t("kids.whatBuy")}</p>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.mcc}
              onClick={() => setShopCat(c)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 transition-colors ${
                shopCat?.mcc === c.mcc
                  ? "border-fuchsia-400/50 bg-fuchsia-500/15"
                  : "border-white/10 hover:bg-white/[0.06]"
              }`}
            >
              <c.Icon className="h-5 w-5" style={{ color: c.color }} />
              <span className="text-[11px] text-white/60">{catLabel(c.mcc)}</span>
            </button>
          ))}
        </div>
        <input
          type="number"
          placeholder={t("kids.howMuch")}
          value={shopAmount}
          onChange={(e) => setShopAmount(e.target.value)}
          className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-fuchsia-400/60"
        />
        {shopMsg && (
          <p className={`text-sm font-medium ${shopMsg.ok ? "text-emerald-300" : "text-rose-300"}`}>
            {shopMsg.text}
          </p>
        )}
        <button
          onClick={() => spend.mutate()}
          disabled={!shopCat || !shopAmount || spend.isPending}
          className="w-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {spend.isPending
            ? t("kids.buying")
            : shopCat
            ? t("kids.buyFor", { cat: catLabel(shopCat.mcc), sum: shopAmount ? formatSum(parseFloat(shopAmount)) : "…" })
            : t("kids.pickCategory")}
        </button>
      </KCard>
    </div>
  );
}
