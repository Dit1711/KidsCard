"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wallet, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatSum } from "@/lib/format";
import { familyService, moneyRequestService } from "@/lib/api";
import { useFamilyStore } from "@/store/family";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PERIOD: Record<string, string> = {
  DAILY: "дневной",
  WEEKLY: "недельный",
  MONTHLY: "месячный",
  CATEGORY: "категорийный",
};

const STATUS: Record<string, { label: string; variant: "secondary" | "default" | "destructive" }> = {
  PENDING: { label: "Ожидает", variant: "secondary" },
  APPROVED: { label: "Одобрено", variant: "default" },
  DECLINED: { label: "Отклонено", variant: "destructive" },
};

export default function RequestsPage() {
  const qc = useQueryClient();
  const { family } = useFamilyStore();

  const { data: children } = useQuery({
    queryKey: ["family-children", family?.id],
    queryFn: async () => {
      const { data } = await familyService.getChildren(family!.id);
      return data.data;
    },
    enabled: !!family?.id,
  });

  const { data: requests } = useQuery({
    queryKey: ["money-requests", family?.id],
    queryFn: async () => {
      const { data } = await moneyRequestService.list(family!.id);
      return data.data;
    },
    enabled: !!family?.id,
    refetchInterval: 15_000,
  });

  const approve = useMutation({
    mutationFn: (id: string) => moneyRequestService.approve(family!.id, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["money-requests", family!.id] });
      toast.success("Запрос одобрен");
    },
    onError: () => toast.error("Не удалось одобрить запрос"),
  });
  const decline = useMutation({
    mutationFn: (id: string) => moneyRequestService.decline(family!.id, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["money-requests", family!.id] });
      toast("Запрос отклонён");
    },
  });

  if (!family) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Запросы</h1>
        <p className="text-muted-foreground">Сначала создайте семью.</p>
      </div>
    );
  }

  const childName = (id: string) => children?.find((c) => c.id === id)?.fullName ?? "Ребёнок";
  const pending = requests?.filter((r) => r.status === "PENDING") ?? [];
  const resolved = requests?.filter((r) => r.status !== "PENDING") ?? [];

  function describe(r: { type: string; amountUzs: number; limitType: string | null }) {
    return r.type === "TOPUP"
      ? `Пополнить карту на ${formatSum(r.amountUzs)}`
      : `Поднять ${PERIOD[r.limitType ?? ""] ?? ""} лимит до ${formatSum(r.amountUzs)}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Запросы от детей</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Пополнение карты и повышение лимитов — по просьбе ребёнка
        </p>
      </div>

      {/* Pending */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ожидают решения</CardTitle>
          <CardDescription>Одобрите или отклоните запрос</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 && (
            <p className="text-sm text-muted-foreground">Новых запросов нет</p>
          )}
          {pending.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {r.type === "TOPUP"
                    ? <Wallet className="inline h-4 w-4 -mt-0.5 mr-1.5 text-muted-foreground" />
                    : <ShieldCheck className="inline h-4 w-4 -mt-0.5 mr-1.5 text-muted-foreground" />}
                  {childName(r.childId)}: {describe(r)}
                </p>
                {r.note && <p className="text-xs text-muted-foreground mt-0.5">«{r.note}»</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => approve.mutate(r.id)}
                  disabled={approve.isPending || decline.isPending}
                >
                  Одобрить
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => decline.mutate(r.id)}
                  disabled={approve.isPending || decline.isPending}
                >
                  Отклонить
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">История запросов</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {resolved.length === 0 && (
            <p className="text-sm text-muted-foreground">Пока пусто</p>
          )}
          {resolved.map((r) => {
            const st = STATUS[r.status] ?? { label: r.status, variant: "secondary" as const };
            return (
              <div key={r.id} className="flex items-center justify-between gap-3 p-2 rounded-lg">
                <p className="text-sm text-foreground min-w-0 truncate">
                  {r.type === "TOPUP"
                    ? <Wallet className="inline h-4 w-4 -mt-0.5 mr-1.5 text-muted-foreground" />
                    : <ShieldCheck className="inline h-4 w-4 -mt-0.5 mr-1.5 text-muted-foreground" />}
                  {childName(r.childId)}: {describe(r)}
                </p>
                <Badge variant={st.variant}>{st.label}</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
