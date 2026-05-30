"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { useFamilyStore } from "@/store/family";
import { familyService, cardService } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function formatSum(uzs: number) {
  return new Intl.NumberFormat("ru-UZ").format(uzs) + " сум";
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

  const totalBalance = cardsData?.reduce((sum, c) => sum + c.balanceUzs, 0) ?? 0;
  const activeCards = cardsData?.filter((c) => c.status === "ACTIVE").length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Привет! 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {user?.phone} · {user?.roles.join(", ")}
        </p>
      </div>

      {familyLoading && (
        <p className="text-gray-400">Загрузка данных семьи...</p>
      )}

      {!familyLoading && !familyData && (
        <Card className="border-dashed border-2 border-indigo-200">
          <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
            <p className="text-gray-500">У вас ещё нет семьи</p>
            <Link href="/family">
              <Button>Создать семью</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {familyData && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Семья</CardDescription>
                <CardTitle className="text-lg">{familyData.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={familyData.status === "ACTIVE" ? "default" : "secondary"}>
                  {familyData.status}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Детей</CardDescription>
                <CardTitle className="text-2xl">{childrenData?.length ?? "—"}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-400">активных в семье</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Карт выдано</CardDescription>
                <CardTitle className="text-2xl">{activeCards}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-400">
                  Баланс: {formatSum(totalBalance)}
                </p>
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
                      className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
                    >
                      <CardContent className="pt-4 pb-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-indigo-200 text-xs">{card.cardType} · {card.network}</p>
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
                        <div className="flex justify-between items-end mt-3">
                          <p className="text-indigo-200 text-sm">
                            {card.expiryMonth.toString().padStart(2, "0")}/{card.expiryYear}
                          </p>
                          <p className="text-xl font-bold">{formatSum(card.balanceUzs)}</p>
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
                <p className="text-gray-400">Карты ещё не выданы</p>
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
