"use client";

import { useQuery } from "@tanstack/react-query";
import { formatSum } from "@/lib/format";
import { useAuthStore } from "@/store/auth";
import { useFamilyStore } from "@/store/family";
import { familyService, cardService } from "@/lib/api";
import { useCardBalances } from "@/hooks/useCardBalances";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MotionStagger, MotionItem } from "@/components/motion";
import Link from "next/link";
import {
  IdCard,
  Plus,
  ShieldCheck,
  ListChecks,
  Users,
  CreditCard,
  ChevronRight,
} from "lucide-react";

function HeroAction({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur px-3.5 py-2.5 text-sm font-medium transition-colors"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { family, setFamily } = useFamilyStore();

  const { data: familyData, isLoading: familyLoading } = useQuery({
    queryKey: ["my-family"],
    queryFn: async () => {
      const { data } = await familyService.getMyFamily();
      setFamily(data.data);
      return data.data;
    },
    retry: false,
  });

  const { data: cardsData } = useQuery({
    queryKey: ["family-cards", familyData?.id],
    queryFn: async () => {
      const { data } = await cardService.getByFamily(familyData!.id);
      return data.data;
    },
    enabled: !!familyData?.id,
  });

  const { data: childrenData } = useQuery({
    queryKey: ["family-children", familyData?.id],
    queryFn: async () => {
      const { data } = await familyService.getChildren(familyData!.id);
      return data.data;
    },
    enabled: !!familyData?.id,
  });

  const cardIds = cardsData?.map((c) => c.id) ?? [];
  const { byCard: balances, total: totalBalance } = useCardBalances(cardIds);
  const activeCards = cardsData?.filter((c) => c.status === "ACTIVE").length ?? 0;

  const myParent = familyData?.parents.find((p) => p.userId === user?.id);
  const needsKyc = myParent != null && myParent.kycStatus !== "APPROVED";

  if (familyLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40 rounded-lg" />
        <Skeleton className="h-44 rounded-3xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-44 rounded-2xl" />
      </div>
    );
  }

  if (!familyData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-3xl bg-accent text-primary">
          <Users className="h-8 w-8" />
        </span>
        <div>
          <p className="font-semibold text-lg">У вас ещё нет семьи</p>
          <p className="text-muted-foreground text-sm mt-1">Создайте семью, чтобы выпускать карты детям</p>
        </div>
        <Link href="/family"><Button size="lg">Создать семью</Button></Link>
      </div>
    );
  }

  return (
    <MotionStagger className="space-y-6">
      <MotionItem>
        <h1 className="text-2xl font-bold tracking-tight">Обзор</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {user?.phone} · {user?.roles.join(", ")}
        </p>
      </MotionItem>

      {needsKyc && (
        <MotionItem>
          <Link href="/kyc" className="block group">
            <div className="flex items-center gap-4 rounded-2xl border border-amber-300/70 bg-amber-50 px-5 py-4 transition-colors hover:bg-amber-100/70">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600">
                <IdCard className="h-6 w-6" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-amber-900">Подтвердите личность</p>
                <p className="text-sm text-amber-700">Нужно для полного доступа. Это займёт минуту.</p>
              </div>
              <ChevronRight className="h-5 w-5 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </MotionItem>
      )}

      {/* Hero — total balance + quick actions */}
      <MotionItem>
        <div className="relative overflow-hidden rounded-3xl bg-brand-gradient text-white p-6 sm:p-8 shadow-soft">
          <div className="absolute -top-20 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative">
            <p className="text-white/70 text-sm">Общий баланс детей</p>
            <p className="text-4xl sm:text-5xl font-bold tracking-tight mt-1 tabular-nums">
              {formatSum(totalBalance)}
            </p>
            <p className="text-white/70 text-sm mt-3">
              {familyData.name} · {childrenData?.length ?? 0} детей · {activeCards} активных карт
            </p>
            <div className="flex flex-wrap gap-2.5 mt-6">
              <HeroAction href="/banks" icon={Plus} label="Пополнить" />
              <HeroAction href="/limits" icon={ShieldCheck} label="Лимиты" />
              <HeroAction href="/chores" icon={ListChecks} label="Задания" />
            </div>
          </div>
        </div>
      </MotionItem>

      {/* Stats */}
      <MotionItem>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
            <p className="text-xs text-muted-foreground">Семья</p>
            <p className="text-base font-semibold truncate mt-1">{familyData.name}</p>
            <Badge variant={familyData.status === "ACTIVE" ? "default" : "secondary"} className="mt-2">
              {familyData.status}
            </Badge>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
            <p className="text-xs text-muted-foreground">Детей</p>
            <p className="text-3xl font-bold text-primary mt-1 tabular-nums">{childrenData?.length ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">активных в семье</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-card col-span-2 sm:col-span-1">
            <p className="text-xs text-muted-foreground">Карт выдано</p>
            <p className="text-3xl font-bold text-primary mt-1 tabular-nums">{activeCards}</p>
            <p className="text-xs text-muted-foreground mt-1">всего активных карт</p>
          </div>
        </div>
      </MotionItem>

      {/* Kids' cards */}
      {cardsData && cardsData.length > 0 && (
        <MotionItem>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold tracking-tight">Карты детей</h2>
            <Link href="/cards" className="text-sm text-primary font-medium hover:underline">Все карты</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
            {cardsData.map((card) => {
              const child = childrenData?.find((c) => c.id === card.childId);
              return (
                <div
                  key={card.id}
                  className="snap-start shrink-0 w-[300px] rounded-2xl bg-brand-gradient text-white p-5 shadow-soft"
                >
                  <div className="flex justify-between items-start mb-7">
                    <div>
                      <p className="text-white/60 text-xs">{card.cardType} · {card.network}</p>
                      <p className="font-medium">{child?.fullName ?? "Ребёнок"}</p>
                    </div>
                    <span className={`text-[11px] rounded-full px-2 py-0.5 bg-white/15 ${
                      card.status === "ACTIVE" ? "text-emerald-100"
                        : card.status === "FROZEN" ? "text-amber-100" : "text-red-100"
                    }`}>
                      {card.status}
                    </span>
                  </div>
                  <p className="font-mono tracking-[0.2em] text-white/90">{card.maskedPan}</p>
                  <div className="flex justify-between items-end mt-4">
                    <p className="text-white/60 text-xs">
                      {card.expiryMonth.toString().padStart(2, "0")}/{card.expiryYear}
                    </p>
                    <p className="text-2xl font-bold tabular-nums">{formatSum(balances[card.id] ?? 0)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </MotionItem>
      )}

      {cardsData?.length === 0 && (
        <MotionItem>
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-10 gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <CreditCard className="h-6 w-6" />
            </span>
            <p className="text-muted-foreground">Карты ещё не выданы</p>
            <Link href="/cards"><Button variant="outline">Выдать первую карту</Button></Link>
          </div>
        </MotionItem>
      )}
    </MotionStagger>
  );
}
