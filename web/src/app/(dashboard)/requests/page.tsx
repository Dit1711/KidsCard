"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wallet, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatSum } from "@/lib/format";
import { familyService, moneyRequestService } from "@/lib/api";
import { useFamilyStore } from "@/store/family";
import { Panel, DButton, DBadge } from "@/components/dark";
import { MotionStagger, MotionItem } from "@/components/motion";

const PERIOD: Record<string, string> = {
  DAILY: "дневной", WEEKLY: "недельный", MONTHLY: "месячный", CATEGORY: "категорийный",
};

const STATUS: Record<string, { label: string; tone: "success" | "muted" | "danger" }> = {
  PENDING: { label: "Ожидает", tone: "muted" },
  APPROVED: { label: "Одобрено", tone: "success" },
  DECLINED: { label: "Отклонено", tone: "danger" },
};

export default function RequestsPage() {
  const qc = useQueryClient();
  const { family } = useFamilyStore();

  const { data: children } = useQuery({
    queryKey: ["family-children", family?.id],
    queryFn: async () => (await familyService.getChildren(family!.id)).data.data,
    enabled: !!family?.id,
  });

  const { data: requests } = useQuery({
    queryKey: ["money-requests", family?.id],
    queryFn: async () => (await moneyRequestService.list(family!.id)).data.data,
    enabled: !!family?.id,
    refetchInterval: 15_000,
  });

  const approve = useMutation({
    mutationFn: (id: string) => moneyRequestService.approve(family!.id, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["money-requests", family!.id] }); toast.success("Запрос одобрен"); },
    onError: () => toast.error("Не удалось одобрить запрос"),
  });
  const decline = useMutation({
    mutationFn: (id: string) => moneyRequestService.decline(family!.id, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["money-requests", family!.id] }); toast("Запрос отклонён"); },
  });

  if (!family) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Запросы</h1>
        <p className="text-white/50">Сначала создайте семью.</p>
      </div>
    );
  }

  const childName = (id: string) => children?.find((c) => c.id === id)?.fullName ?? "Ребёнок";
  const pending = requests?.filter((r) => r.status === "PENDING") ?? [];
  const resolved = requests?.filter((r) => r.status !== "PENDING") ?? [];

  const describe = (r: { type: string; amountUzs: number; limitType: string | null }) =>
    r.type === "TOPUP"
      ? `Пополнить карту на ${formatSum(r.amountUzs)}`
      : `Поднять ${PERIOD[r.limitType ?? ""] ?? ""} лимит до ${formatSum(r.amountUzs)}`;

  const TypeIcon = ({ type }: { type: string }) =>
    type === "TOPUP"
      ? <Wallet className="inline h-4 w-4 -mt-0.5 mr-1.5 text-white/50" />
      : <ShieldCheck className="inline h-4 w-4 -mt-0.5 mr-1.5 text-white/50" />;

  return (
    <MotionStagger className="space-y-6">
      <MotionItem>
        <h1 className="text-2xl font-bold tracking-tight">Запросы от детей</h1>
        <p className="text-white/50 mt-1 text-sm">Пополнение карты и повышение лимитов — по просьбе ребёнка</p>
      </MotionItem>

      {/* Pending */}
      <MotionItem>
        <Panel className="p-6">
          <p className="font-medium tracking-tight">Ожидают решения</p>
          <p className="text-xs text-white/40 mb-4">Одобрите или отклоните запрос</p>
          {pending.length === 0 && <p className="text-sm text-white/40">Новых запросов нет</p>}
          <div className="space-y-2.5">
            {pending.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.05]">
                <div className="min-w-0">
                  <p className="text-sm font-medium"><TypeIcon type={r.type} />{childName(r.childId)}: {describe(r)}</p>
                  {r.note && <p className="text-xs text-white/40 mt-0.5">«{r.note}»</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <DButton className="py-2" onClick={() => approve.mutate(r.id)} disabled={approve.isPending || decline.isPending}>Одобрить</DButton>
                  <DButton variant="outline" className="py-2" onClick={() => decline.mutate(r.id)} disabled={approve.isPending || decline.isPending}>Отклонить</DButton>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </MotionItem>

      {/* History */}
      <MotionItem>
        <Panel className="p-6">
          <p className="font-medium tracking-tight mb-4">История запросов</p>
          {resolved.length === 0 && <p className="text-sm text-white/40">Пока пусто</p>}
          <div className="space-y-1.5">
            {resolved.map((r) => {
              const st = STATUS[r.status] ?? { label: r.status, tone: "muted" as const };
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl">
                  <p className="text-sm min-w-0 truncate"><TypeIcon type={r.type} />{childName(r.childId)}: {describe(r)}</p>
                  <DBadge tone={st.tone}>{st.label}</DBadge>
                </div>
              );
            })}
          </div>
        </Panel>
      </MotionItem>
    </MotionStagger>
  );
}
