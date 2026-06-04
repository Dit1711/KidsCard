"use client";

import { useQuery } from "@tanstack/react-query";
import { formatSum } from "@/lib/format";
import { useAuthStore } from "@/store/auth";
import { useFamilyStore } from "@/store/family";
import { familyService, cardService, parentSavingsService } from "@/lib/api";
import { useCardBalances } from "@/hooks/useCardBalances";
import { MotionStagger, MotionItem } from "@/components/motion";
import { CardSurface } from "@/components/CardSurface";
import { useT } from "@/i18n/locale";
import Link from "next/link";
import {
  IdCard, Plus, ShieldCheck, ListChecks, BarChart3, Users, CreditCard,
  ChevronRight, Sparkles, Target, Home,
} from "lucide-react";

const GRADS = [
  "from-violet-500 to-fuchsia-500",
  "from-sky-500 to-indigo-500",
  "from-rose-500 to-orange-400",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-pink-500",
];

function HeroAction({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur px-4 py-2.5 text-sm font-medium transition-colors">
      <Icon className="h-4 w-4" /> {label}
    </Link>
  );
}

export default function DashboardPage() {
  const t = useT();
  const { user } = useAuthStore();
  const { family, setFamily } = useFamilyStore();

  const { data: familyData } = useQuery({
    queryKey: ["my-family"],
    queryFn: async () => {
      const { data } = await familyService.getMyFamily();
      setFamily(data.data);
      return data.data;
    },
    retry: false,
  });

  const fam = familyData ?? family;

  const { data: cardsData } = useQuery({
    queryKey: ["family-cards", fam?.id],
    queryFn: async () => {
      const { data } = await cardService.getByFamily(fam!.id);
      return data.data;
    },
    enabled: !!fam?.id,
  });

  const { data: childrenData } = useQuery({
    queryKey: ["family-children", fam?.id],
    queryFn: async () => {
      const { data } = await familyService.getChildren(fam!.id);
      return data.data;
    },
    enabled: !!fam?.id,
  });

  const { data: goals } = useQuery({
    queryKey: ["parent-goals", fam?.id],
    queryFn: async () => {
      const { data } = await parentSavingsService.list(fam!.id);
      return data.data;
    },
    enabled: !!fam?.id,
  });

  const cardIds = cardsData?.map((c) => c.id) ?? [];
  const { byCard: balances, total: totalBalance } = useCardBalances(cardIds);
  const activeCards = cardsData?.filter((c) => c.status === "ACTIVE").length ?? 0;

  const myParent = fam?.parents.find((p) => p.userId === user?.id);
  const needsKyc = myParent != null && myParent.kycStatus !== "APPROVED";
  const childName = (id: string) => childrenData?.find((c) => c.id === id)?.fullName ?? t("common.child");
  const activeGoals = (goals ?? []).filter((g) => g.status !== "CANCELLED").slice(0, 3);

  if (!fam) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-3xl bg-white/10 text-fuchsia-300">
          <Users className="h-8 w-8" />
        </span>
        <div>
          <p className="font-semibold text-lg">{t("dashboard.noFamilyTitle")}</p>
          <p className="text-white/50 text-sm mt-1">{t("dashboard.noFamilySubtitle")}</p>
        </div>
        <Link href="/family" className="rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-medium">{t("dashboard.createFamily")}</Link>
      </div>
    );
  }

  return (
    <MotionStagger className="space-y-6">
      {needsKyc && (
        <MotionItem>
          <Link href="/kyc" className="group flex items-center gap-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-5 py-4 transition-colors hover:bg-amber-500/15">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-300">
              <IdCard className="h-6 w-6" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-amber-100">{t("dashboard.kycTitle")}</p>
              <p className="text-sm text-amber-200/70">{t("dashboard.kycSubtitle")}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-amber-300/70 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </MotionItem>
      )}

      {/* Hero */}
      <MotionItem>
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-violet-600 via-indigo-600 to-fuchsia-600 p-7 sm:p-8">
          <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <Sparkles className="h-4 w-4" /> {t("dashboard.totalBalance")}
            </div>
            <p className="mt-2 text-5xl sm:text-6xl font-bold tracking-tight tabular-nums">{formatSum(totalBalance)}</p>
            <p className="text-white/70 mt-1">
              {t("dashboard.familyStats", { name: fam.name, children: childrenData?.length ?? 0, cards: activeCards })}
            </p>
            <div className="flex flex-wrap gap-2.5 mt-6">
              <HeroAction href="/banks" icon={Plus} label={t("common.topUp")} />
              <HeroAction href="/limits" icon={ShieldCheck} label={t("nav.limits")} />
              <HeroAction href="/chores" icon={ListChecks} label={t("nav.chores")} />
              <HeroAction href="/analytics" icon={BarChart3} label={t("nav.analytics")} />
            </div>
          </div>
        </div>
      </MotionItem>

      {/* Kids cards */}
      {cardsData && cardsData.length > 0 && (
        <MotionItem>
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold tracking-tight">{t("dashboard.kidsCards")}</p>
            <Link href="/cards" className="text-sm text-fuchsia-300/80 hover:text-fuchsia-300">{t("dashboard.allCards")}</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-1 -mx-1 px-1">
            {cardsData.map((card) => (
              <CardSurface
                key={card.id}
                theme={card.theme}
                pattern={card.pattern}
                className="shrink-0 w-56 rounded-3xl p-5 text-white"
              >
                <div className="flex items-center justify-between">
                  <CreditCard className="h-5 w-5 text-white/80" />
                  <span className="text-xs text-white/70 font-mono">•• {card.maskedPan.slice(-4)}</span>
                </div>
                <p className="mt-8 text-white/70 text-xs">{childName(card.childId)}</p>
                <p className="text-2xl font-bold tabular-nums">{formatSum(balances[card.id] ?? 0)}</p>
              </CardSurface>
            ))}
          </div>
        </MotionItem>
      )}

      {cardsData?.length === 0 && (
        <MotionItem>
          <div className="flex flex-col items-center justify-center rounded-3xl border border-white/[0.06] bg-white/[0.03] py-10 gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-white/50"><CreditCard className="h-6 w-6" /></span>
            <p className="text-white/50">{t("dashboard.noCards")}</p>
            <Link href="/cards" className="rounded-2xl bg-white/10 hover:bg-white/15 px-4 py-2 text-sm font-medium">{t("dashboard.issueFirstCard")}</Link>
          </div>
        </MotionItem>
      )}

      {/* Stats + goals */}
      <MotionItem>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <div className="rounded-3xl bg-white/[0.04] border border-white/[0.06] p-5">
              <p className="text-xs text-white/40">{t("dashboard.statChildren")}</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">{childrenData?.length ?? "—"}</p>
            </div>
            <div className="rounded-3xl bg-white/[0.04] border border-white/[0.06] p-5">
              <p className="text-xs text-white/40">{t("dashboard.statActiveCards")}</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">{activeCards}</p>
            </div>
            <div className="col-span-2 rounded-3xl bg-white/[0.04] border border-white/[0.06] p-5 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white/10"><Home className="h-5 w-5 text-fuchsia-300" /></span>
              <div>
                <p className="text-xs text-white/40">{t("nav.family")}</p>
                <p className="font-semibold">{fam.name}</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 rounded-3xl bg-white/[0.04] border border-white/[0.06] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-4 w-4 text-fuchsia-300" />
              <p className="font-medium tracking-tight">{t("dashboard.savingsGoals")}</p>
            </div>
            {activeGoals.length === 0 ? (
              <p className="text-sm text-white/40">{t("dashboard.noGoals")}</p>
            ) : (
              <div className="space-y-4">
                {activeGoals.map((g, i) => {
                  const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
                  return (
                    <div key={g.id}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-white/80">{g.title} · {childName(g.childId)}</span>
                        <span className="text-white/50 tabular-nums">{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className={`h-full rounded-full bg-gradient-to-r ${GRADS[i % GRADS.length]}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-white/40 mt-1 tabular-nums">{t("dashboard.goalProgress", { current: formatSum(g.currentAmount), target: formatSum(g.targetAmount) })}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </MotionItem>
    </MotionStagger>
  );
}
