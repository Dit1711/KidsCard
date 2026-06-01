"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { familyService, cardService } from "@/lib/api";
import { useCardBalances } from "@/hooks/useCardBalances";
import { useFamilyStore } from "@/store/family";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

function formatSum(uzs: number) {
  return new Intl.NumberFormat("ru-UZ").format(uzs) + " сум";
}

const CARD_TYPES = ["VIRTUAL", "PHYSICAL"];
const NETWORKS = ["UZCARD", "HUMO", "VISA"];

export default function CardsPage() {
  const qc = useQueryClient();
  const { family } = useFamilyStore();

  const [showIssue, setShowIssue] = useState(false);
  const [selectedChild, setSelectedChild] = useState("");
  const [cardType, setCardType] = useState("VIRTUAL");
  const [network, setNetwork] = useState("UZCARD");

  const { data: children } = useQuery({
    queryKey: ["family-children", family?.id],
    queryFn: async () => {
      const { data } = await familyService.getChildren(family!.id);
      return data.data;
    },
    enabled: !!family?.id,
  });

  const { data: cards, isLoading } = useQuery({
    queryKey: ["family-cards", family?.id],
    queryFn: async () => {
      const { data } = await cardService.getByFamily(family!.id);
      return data.data;
    },
    enabled: !!family?.id,
  });

  const { byCard: balances } = useCardBalances(cards?.map((c) => c.id) ?? []);

  const issueCard = useMutation({
    mutationFn: () =>
      cardService.issue(family!.id, selectedChild, cardType, network),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-cards", family!.id] });
      setShowIssue(false);
      setSelectedChild("");
    },
  });

  const freezeCard = useMutation({
    mutationFn: (cardId: string) => cardService.freeze(family!.id, cardId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family-cards", family!.id] }),
  });

  const unfreezeCard = useMutation({
    mutationFn: (cardId: string) => cardService.unfreeze(family!.id, cardId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family-cards", family!.id] }),
  });

  if (!family) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Карты</h1>
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center py-10 gap-3">
            <p className="text-gray-400">Сначала создайте семью</p>
            <Link href="/family"><Button>Перейти к семье</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Карты</h1>
        <Button onClick={() => setShowIssue(!showIssue)} variant={showIssue ? "outline" : "default"}>
          {showIssue ? "Отмена" : "+ Выдать карту"}
        </Button>
      </div>

      {/* Issue card form */}
      {showIssue && (
        <Card>
          <CardHeader>
            <CardTitle>Новая карта</CardTitle>
            <CardDescription>Выдайте виртуальную или физическую карту ребёнку</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Ребёнок</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedChild}
                onChange={(e) => setSelectedChild(e.target.value)}
              >
                <option value="">Выберите ребёнка</option>
                {children?.map((c) => (
                  <option key={c.id} value={c.id}>{c.fullName}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Тип карты</Label>
              <div className="flex gap-2">
                {CARD_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setCardType(t)}
                    className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                      cardType === t
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "border-gray-200 hover:border-indigo-300"
                    }`}
                  >
                    {t === "VIRTUAL" ? "💻 Виртуальная" : "💳 Физическая"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Платёжная система</Label>
              <div className="flex gap-2">
                {NETWORKS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setNetwork(n)}
                    className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                      network === n
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "border-gray-200 hover:border-indigo-300"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {issueCard.isError && (
              <p className="text-sm text-red-500">Ошибка выдачи карты</p>
            )}

            <Button
              onClick={() => issueCard.mutate()}
              disabled={!selectedChild || issueCard.isPending}
              className="w-full"
            >
              {issueCard.isPending ? "Выдача..." : "Выдать карту"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Cards list */}
      {isLoading && <p className="text-gray-400">Загрузка...</p>}

      {cards?.length === 0 && !showIssue && (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center py-10 gap-3">
            <p className="text-gray-400">Карты ещё не выданы</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {cards?.map((card) => {
          const child = children?.find((c) => c.id === card.childId);
          const isFrozen = card.status === "FROZEN";
          const isBlocked = card.status === "BLOCKED";

          return (
            <Card key={card.id} className={isBlocked ? "opacity-60" : ""}>
              <CardContent className="pt-5 pb-5">
                {/* Card visual */}
                <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4 mb-4">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-xs text-indigo-200">{card.cardType} · {card.network}</p>
                      <p className="font-semibold">{child?.fullName ?? "Ребёнок"}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`border-white/30 text-xs ${
                        isFrozen ? "text-yellow-300" : isBlocked ? "text-red-300" : "text-green-300"
                      }`}
                    >
                      {card.status}
                    </Badge>
                  </div>
                  <p className="font-mono text-lg tracking-widest mb-3">{card.maskedPan}</p>
                  <div className="flex justify-between">
                    <span className="text-indigo-200 text-sm">
                      {String(card.expiryMonth).padStart(2, "0")}/{card.expiryYear}
                    </span>
                    <span className="font-bold">{formatSum(balances[card.id] ?? 0)}</span>
                  </div>
                </div>

                {/* Actions */}
                {!isBlocked && (
                  <div className="flex gap-2">
                    {isFrozen ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => unfreezeCard.mutate(card.id)}
                        disabled={unfreezeCard.isPending}
                      >
                        ❄️ Разморозить
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => freezeCard.mutate(card.id)}
                        disabled={freezeCard.isPending}
                      >
                        🔒 Заморозить
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
