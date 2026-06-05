"use client";

import { useState } from "react";
import { formatSum } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { childAuthService } from "@/lib/api";
import { useChildStore } from "@/store/child";
import { categoryLabel, periodRemainingLabel } from "@/lib/categories";
import { useT } from "@/i18n/locale";
import { CardSurface } from "@/components/CardSurface";
import { CARD_PATTERNS, patternLabel } from "@/lib/cardThemes";
import { ThemePicker } from "@/components/ThemePicker";
import { KCard, XpBar, LEAGUE_META, leagueLabel, badgeTitle, badgeDesc } from "@/components/kidkit";
import { ShareLocationButton } from "@/components/ShareLocationButton";
import {
  Palette, Snowflake, TrendingUp, ShieldCheck, Wallet, Send,
  PiggyBank, Award, Target, GraduationCap, Crown, Trophy, Lock, Sparkles, type LucideIcon,
} from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

const typeMeta: Record<string, { label: string; icon: string }> = {
  TOPUP: { label: "kidh.txTopup", icon: "💰" },
  PURCHASE: { label: "kidh.txPurchase", icon: "🛒" },
  ALLOWANCE: { label: "kidh.txAllowance", icon: "💸" },
  REFUND: { label: "kidh.txRefund", icon: "↩️" },
  TRANSFER: { label: "kidh.txTransfer", icon: "🔁" },
};

const BADGE_ICON: Record<string, LucideIcon> = {
  first_chore: Target,
  chore_10: Trophy,
  first_lesson: GraduationCap,
  lesson_5: Award,
  first_goal: PiggyBank,
  study_5: Sparkles,
  streak_7: TrendingUp,
  saver_1m: Crown,
};

export default function KidHomePage() {
  const { isChildAuthed } = useChildStore();
  const t = useT();
  const qc = useQueryClient();

  const { data: cards } = useQuery({
    queryKey: ["child-cards"],
    queryFn: async () => (await childAuthService.myCards()).data.data,
    enabled: isChildAuthed,
  });
  const card = cards?.[0];

  const { data: balance } = useQuery({
    queryKey: ["child-balance", card?.id],
    queryFn: async () => (await childAuthService.balance(card!.id)).data.data.balanceUzs,
    enabled: !!card?.id,
    refetchInterval: 10_000,
  });

  const { data: txPage } = useQuery({
    queryKey: ["child-tx", card?.id],
    queryFn: async () => (await childAuthService.transactions(card!.id, 20)).data.data,
    enabled: !!card?.id,
  });

  const { data: limitUsage } = useQuery({
    queryKey: ["child-limit-usage", card?.id],
    queryFn: async () => (await childAuthService.limitUsage(card!.id)).data.data,
    enabled: !!card?.id,
    refetchInterval: 15_000,
  });

  const { data: requests } = useQuery({
    queryKey: ["child-requests"],
    queryFn: async () => (await childAuthService.myRequests()).data.data,
    enabled: isChildAuthed,
    refetchInterval: 20_000,
  });

  const { data: gami } = useQuery({
    queryKey: ["child-gamification"],
    queryFn: async () => (await childAuthService.gamification()).data.data,
    enabled: isChildAuthed,
    refetchInterval: 30_000,
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
      setReqAmount(""); setReqNote(""); setShowReq(false);
    },
  });

  const reqStatus: Record<string, { label: string; cls: string }> = {
    PENDING: { label: "kidh.reqWaiting", cls: "text-amber-300" },
    APPROVED: { label: "requests.statusApproved", cls: "text-emerald-300" },
    DECLINED: { label: "requests.statusDeclined", cls: "text-white/40" },
  };

  const league = gami ? LEAGUE_META[gami.league] ?? LEAGUE_META.BRONZE : null;
  const mascotMsg = !gami
    ? ""
    : !gami.activeToday
    ? t("kidh.mascotIdle")
    : gami.streakDays >= 3
    ? t("kidh.mascotStreak", { days: gami.streakDays })
    : t("kidh.mascotStart");

  return (
    <>
      {/* Gamification hero */}
      {gami && (
        <KCard className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{t("kidh.level", { level: gami.level })}</p>
              <p className="text-[11px] text-white/50">{t("kidh.xpTo", { into: gami.xpIntoLevel, need: gami.xpForNext, next: gami.level + 1 })}</p>
            </div>
            {league && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border"
                style={{ color: league.color, borderColor: `${league.color}40`, backgroundColor: `${league.color}1a` }}
              >
                <Trophy className="h-3.5 w-3.5" /> {leagueLabel(gami.league)}
              </span>
            )}
          </div>
          <XpBar value={gami.xpIntoLevel} max={gami.xpForNext} />
          <p className="text-xs text-white/60 bg-white/[0.04] rounded-xl px-3 py-2 border border-white/[0.06]">{mascotMsg}</p>
        </KCard>
      )}

      {/* Quick: share where I am with my parents */}
      <ShareLocationButton />

      {/* Card / balance */}
      {!card && (
        <KCard className="p-8 text-center text-white/40">{t("kidg.noCard")}</KCard>
      )}
      {card && (
        <div className="space-y-3">
          <CardSurface theme={card.theme} pattern={card.pattern} className="rounded-3xl text-white p-6 shadow-xl">
            <div className="flex justify-between items-start mb-8">
              <span className="text-sm text-white/80">{card.network}</span>
              <button
                onClick={() => setShowDesign(!showDesign)}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                title={t("kidh.cardDesign")}
              >
                <Palette className="h-4 w-4" />
              </button>
            </div>
            <p className="text-white/70 text-xs mb-1">{t("kidh.myMoney")}</p>
            <p className="text-4xl font-extrabold mb-6">{formatSum(balance)}</p>
            <p className="font-mono tracking-widest text-white/90">{card.maskedPan}</p>
            {card.status !== "ACTIVE" && (
              <p className="mt-3 text-xs bg-white/20 rounded-full px-3 py-1 inline-flex items-center gap-1.5">
                {card.status === "FROZEN" ? <><Snowflake className="h-3.5 w-3.5" /> {t("kids.frozen")}</> : t("kids.unavailable")}
              </p>
            )}
          </CardSurface>

          {showDesign && (
            <KCard className="p-4 space-y-3">
              <p className="text-sm font-bold flex items-center gap-1.5"><Palette className="h-4 w-4 text-fuchsia-300" /> {t("kidh.cardColor")}</p>
              <ThemePicker
                selected={card.theme}
                onSelect={(key) => setDesign.mutate({ theme: key, pattern: card.pattern })}
                ringOffset="ring-offset-[#08080f]"
              />
              <p className="text-sm font-bold pt-1">{t("kidh.pattern")}</p>
              <div className="flex gap-2 flex-wrap">
                {CARD_PATTERNS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setDesign.mutate({ theme: card.theme, pattern: p.key })}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      card.pattern === p.key ? "border-fuchsia-400 bg-fuchsia-500/15 text-fuchsia-200" : "border-white/10 text-white/60"
                    }`}
                  >
                    {patternLabel(p.key)}
                  </button>
                ))}
              </div>
            </KCard>
          )}
        </div>
      )}

      {/* Achievements shelf */}
      {gami && (
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-base font-bold flex items-center gap-1.5"><Award className="h-4 w-4 text-fuchsia-300" /> {t("analytics.badges")}</h2>
            <span className="text-[11px] text-white/40">{t("analytics.ofCount", { earned: gami.badges.filter((b) => b.earned).length, total: gami.badges.length })}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {gami.badges.map((b) => {
              const Icon = BADGE_ICON[b.key] ?? Award;
              return (
                <div
                  key={b.key}
                  title={`${badgeTitle(b.key)} — ${badgeDesc(b.key)}`}
                  className={`flex flex-col items-center gap-1 rounded-2xl p-2.5 border ${
                    b.earned ? "border-white/15 bg-white/[0.06]" : "border-white/5 bg-white/[0.02]"
                  }`}
                >
                  {b.earned ? (
                    <Icon className="h-5 w-5 text-fuchsia-300" />
                  ) : (
                    <Lock className="h-5 w-5 text-white/25" />
                  )}
                  <span className={`text-[9px] text-center leading-tight ${b.earned ? "text-white/70" : "text-white/30"}`}>{badgeTitle(b.key)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ask a parent */}
      {card && (
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-base font-bold flex items-center gap-1.5"><Send className="h-4 w-4 text-fuchsia-300" /> {t("kidh.askParents")}</h2>
            <button onClick={() => setShowReq(!showReq)} className="text-sm text-fuchsia-300 font-medium">
              {showReq ? t("common.cancel") : t("kidh.ask")}
            </button>
          </div>

          {showReq && (
            <KCard className="p-4 space-y-3 mb-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setReqType("TOPUP")}
                  className={`rounded-xl border py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    reqType === "TOPUP" ? "border-fuchsia-400 bg-fuchsia-500/15 text-fuchsia-200" : "border-white/10 text-white/60"
                  }`}
                >
                  <Wallet className="h-4 w-4" /> {t("common.topUp")}
                </button>
                <button
                  onClick={() => setReqType("LIMIT")}
                  className={`rounded-xl border py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    reqType === "LIMIT" ? "border-fuchsia-400 bg-fuchsia-500/15 text-fuchsia-200" : "border-white/10 text-white/60"
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" /> {t("kidh.raiseLimit")}
                </button>
              </div>

              {reqType === "LIMIT" && (
                <div className="flex gap-2">
                  {[{ v: "DAILY", l: "kidh.day" }, { v: "WEEKLY", l: "kidh.week" }, { v: "MONTHLY", l: "kidh.month" }].map((p) => (
                    <button
                      key={p.v}
                      onClick={() => setReqPeriod(p.v)}
                      className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                        reqPeriod === p.v ? "border-fuchsia-400 bg-fuchsia-500/15 text-fuchsia-200" : "border-white/10 text-white/60"
                      }`}
                    >
                      {t(p.l)}
                    </button>
                  ))}
                </div>
              )}

              <input
                type="number"
                placeholder={reqType === "TOPUP" ? t("kidh.howMuchMoney") : t("kidh.newLimit")}
                value={reqAmount}
                onChange={(e) => setReqAmount(e.target.value)}
                className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-fuchsia-400/60"
              />
              <input
                placeholder={t("kidh.why")}
                value={reqNote}
                onChange={(e) => setReqNote(e.target.value)}
                className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-fuchsia-400/60"
              />
              <button
                onClick={() => createRequest.mutate()}
                disabled={!reqAmount || createRequest.isPending}
                className="w-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {createRequest.isPending ? t("kidh.sending") : t("kidh.sendRequest")}
              </button>
            </KCard>
          )}

          {requests && requests.length > 0 && (
            <div className="space-y-2">
              {requests.slice(0, 5).map((r) => {
                const st = reqStatus[r.status] ?? { label: r.status, cls: "" };
                return (
                  <KCard key={r.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        {r.type === "TOPUP" ? <Wallet className="h-3.5 w-3.5 text-white/60" /> : <ShieldCheck className="h-3.5 w-3.5 text-white/60" />}
                        {r.type === "TOPUP" ? t("kidh.txTopup") : t("kidh.limitWord")} · {formatSum(r.amountUzs)}
                      </p>
                      {r.note && <p className="text-xs text-white/40 truncate">«{r.note}»</p>}
                    </div>
                    <span className={`shrink-0 text-xs font-semibold ${st.cls}`}>{t(st.label)}</span>
                  </KCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* My limits */}
      {limitUsage && limitUsage.length > 0 && (
        <div>
          <h2 className="text-base font-bold mb-1 px-1 flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-fuchsia-300" /> {t("kidh.myLimits")}</h2>
          <p className="text-xs text-white/40 mb-3 px-1">{t("kidh.canSpend")}</p>
          <div className="space-y-2">
            {limitUsage.map((u, i) => {
              const label =
                u.limitType === "CATEGORY"
                  ? t("kidh.catMonthly", { cat: categoryLabel(u.category) })
                  : periodRemainingLabel(u.limitType);
              const pct = u.limitUzs > 0 ? Math.min(100, Math.round((u.spentUzs / u.limitUzs) * 100)) : 0;
              const low = u.remainingUzs <= u.limitUzs * 0.15;
              return (
                <KCard key={i} className="p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-white/80">{label}</span>
                    <span className={`text-xs font-semibold ${low ? "text-rose-300" : "text-emerald-300"}`}>
                      {t("kidh.left", { sum: formatSum(u.remainingUzs) })}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full rounded-full ${low ? "bg-rose-400" : "bg-emerald-400"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] text-white/40 mt-1">{t("kidh.spentOf", { spent: formatSum(u.spentUzs), limit: formatSum(u.limitUzs) })}</p>
                </KCard>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      {card && (
        <div>
          <h2 className="text-base font-bold mb-3 px-1">{t("kidh.history")}</h2>
          {txPage?.content.length === 0 && <p className="text-white/40 text-sm px-1">{t("kidh.noTx")}</p>}
          <div className="space-y-2">
            {txPage?.content.map((tx) => {
              const isCredit = tx.direction === "CREDIT";
              const meta = typeMeta[tx.type] ?? { label: tx.type, icon: "•" };
              return (
                <KCard key={tx.id} className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-lg">{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.merchantName ?? t(meta.label)}</p>
                    <p className="text-xs text-white/40">{formatDate(tx.createdAt)}</p>
                  </div>
                  <p className={`font-bold text-sm ${isCredit ? "text-emerald-300" : "text-white"}`}>
                    {isCredit ? "+" : "−"}{formatSum(tx.amountUzs)}
                  </p>
                </KCard>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
