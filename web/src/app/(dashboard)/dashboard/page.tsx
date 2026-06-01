"use client";

import { useQuery } from "@tanstack/react-query";
import { formatSum } from "@/lib/format";
import { useAuthStore } from "@/store/auth";
import { useFamilyStore } from "@/store/family";
import { familyService, cardService } from "@/lib/api";
import { useCardBalances } from "@/hooks/useCardBalances";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IdCard } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Обзор</h1>
        <p className="text-muted-foreground mt-1">
          {user?.phone} · {user?.roles.join(", ")}
        </p>
      </div>

      {needsKyc && (
        <Link href="/kyc" className="block">
          <Card className="border-amber-300 bg-amber-50 hover:bg-amber-100 transition-colors">
            <CardContent className="flex items-center gap-4 py-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600">
                <IdCard className="h-6 w-6" />
              </span>
              <div className="flex-1">
                <p className="font-medium text-amber-900">Подтвердите личность</p>
                <p className="text-sm text-amber-700">
                  Верификация нужна для полного доступа к платформе. Это займёт минуту.
                </p>
              </div>
              <Badge variant="outline" className="border-amber-400 text-amber-700">
                {myParent?.kycStatus === "REJECTED" ? "Отклонено" : "Ожидает"}
              </Badge>
            </CardContent>
          </Card>
        </Link>
      )}

      {familyLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </div>
        </div>
      )}

      {!familyLoading && !familyData && (
        <Card className="border-dashed border-2 border-border">
          <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
            <p className="text-muted-foreground">У вас ещё нет семьи</p>
            <Link href="/family">
              <Button>Создать семью</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {familyData && (
        <>
          {/* Hero — total balance */}
          <div className="rounded-3xl bg-brand-gradient text-white p-6 sm:p-7 shadow-soft">
            <p className="text-white/70 text-sm">Общий баланс детей</p>
            <p className="text-4xl sm:text-5xl font-bold tracking-tight mt-1">
              {formatSum(totalBalance)}
            </p>
            <p className="text-white/70 text-sm mt-4">
              {familyData.name} · {childrenData?.length ?? 0} детей · {activeCards} активных карт
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Card className="shadow-card border-border/60">
              <CardHeader className="pb-2">
                <CardDescription>Семья</CardDescription>
                <CardTitle className="text-base truncate">{familyData.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={familyData.status === "ACTIVE" ? "default" : "secondary"}>
                  {familyData.status}
                </Badge>
              </CardContent>
            </Card>

            <Card className="shadow-card border-border/60">
              <CardHeader className="pb-2">
                <CardDescription>Детей</CardDescription>
                <CardTitle className="text-3xl text-primary">{childrenData?.length ?? "—"}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">активных в семье</p>
              </CardContent>
            </Card>

            <Card className="shadow-card border-border/60 col-span-2 sm:col-span-1">
              <CardHeader className="pb-2">
                <CardDescription>Карт выдано</CardDescription>
                <CardTitle className="text-3xl text-primary">{activeCards}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">всего активных карт</p>
              </CardContent>
            </Card>
          </div>

          {/* Cards overview */}
          {cardsData && cardsData.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Карты детей</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cardsData.map((card) => {
                  const child = childrenData?.find((c) => c.id === card.childId);
                  return (
                    <Card
                      key={card.id}
                      className="bg-brand-gradient text-white border-0 shadow-soft rounded-2xl"
                    >
                      <CardContent className="pt-5 pb-5">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <p className="text-white/60 text-xs">{card.cardType} · {card.network}</p>
                            <p className="font-medium">{child?.fullName ?? "Ребёнок"}</p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs border-white/40 ${
                              card.status === "ACTIVE"
                                ? "text-green-200"
                                : card.status === "FROZEN"
                                ? "text-yellow-200"
                                : "text-red-200"
                            }`}
                          >
                            {card.status}
                          </Badge>
                        </div>
                        <p className="font-mono text-lg tracking-wider">{card.maskedPan}</p>
                        <div className="flex justify-between items-end mt-4">
                          <p className="text-white/60 text-sm">
                            {card.expiryMonth.toString().padStart(2, "0")}/{card.expiryYear}
                          </p>
                          <p className="text-xl font-bold">{formatSum(balances[card.id] ?? 0)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {cardsData?.length === 0 && (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
                <p className="text-muted-foreground">Карты ещё не выданы</p>
                <Link href="/cards">
                  <Button variant="outline">Выдать первую карту</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
