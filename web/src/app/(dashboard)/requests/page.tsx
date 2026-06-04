"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wallet, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatSum } from "@/lib/format";
import { familyService, moneyRequestService } from "@/lib/api";
import { useFamilyStore } from "@/store/family";
import { Panel, DButton, DBadge } from "@/components/dark";
import { MotionStagger, MotionItem } from "@/components/motion";
import { useT } from "@/i18n/locale";

const PERIOD_KEY: Record<string, string> = {
  DAILY: "requests.periodDaily", WEEKLY: "requests.periodWeekly",
  MONTHLY: "requests.periodMonthly", CATEGORY: "requests.periodCategory",
};

const STATUS: Record<string, { labelKey: string; tone: "success" | "muted" | "danger" }> = {
  PENDING: { labelKey: "requests.statusPending", tone: "muted" },
  APPROVED: { labelKey: "requests.statusApproved", tone: "success" },
  DECLINED: { labelKey: "requests.statusDeclined", tone: "danger" },
};

export default function RequestsPage() {
  const qc = useQueryClient();
  const { family } = useFamilyStore();
  const t = useT();

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["money-requests", family!.id] }); toast.success(t("requests.toastApproved")); },
    onError: () => toast.error(t("requests.toastApproveError")),
  });
  const decline = useMutation({
    mutationFn: (id: string) => moneyRequestService.decline(family!.id, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["money-requests", family!.id] }); toast(t("requests.toastDeclined")); },
  });

  if (!family) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">{t("nav.requests")}</h1>
        <p className="text-white/50">{t("cards.needFamily")}</p>
      </div>
    );
  }

  const childName = (id: string) => children?.find((c) => c.id === id)?.fullName ?? t("common.child");
  const pending = requests?.filter((r) => r.status === "PENDING") ?? [];
  const resolved = requests?.filter((r) => r.status !== "PENDING") ?? [];

  const describe = (r: { type: string; amountUzs: number; limitType: string | null }) =>
    r.type === "TOPUP"
      ? t("requests.describeTopup", { sum: formatSum(r.amountUzs) })
      : t("requests.describeLimit", { period: t(PERIOD_KEY[r.limitType ?? ""] ?? ""), sum: formatSum(r.amountUzs) });

  const TypeIcon = ({ type }: { type: string }) =>
    type === "TOPUP"
      ? <Wallet className="inline h-4 w-4 -mt-0.5 mr-1.5 text-white/50" />
      : <ShieldCheck className="inline h-4 w-4 -mt-0.5 mr-1.5 text-white/50" />;

  return (
    <MotionStagger className="space-y-6">
      <MotionItem>
        <h1 className="text-2xl font-bold tracking-tight">{t("requests.title")}</h1>
        <p className="text-white/50 mt-1 text-sm">{t("requests.subtitle")}</p>
      </MotionItem>

      {/* Pending */}
      <MotionItem>
        <Panel className="p-6">
          <p className="font-medium tracking-tight">{t("requests.pendingTitle")}</p>
          <p className="text-xs text-white/40 mb-4">{t("requests.pendingHint")}</p>
          {pending.length === 0 && <p className="text-sm text-white/40">{t("requests.noPending")}</p>}
          <div className="space-y-2.5">
            {pending.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.05]">
                <div className="min-w-0">
                  <p className="text-sm font-medium"><TypeIcon type={r.type} />{childName(r.childId)}: {describe(r)}</p>
                  {r.note && <p className="text-xs text-white/40 mt-0.5">«{r.note}»</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <DButton className="py-2" onClick={() => approve.mutate(r.id)} disabled={approve.isPending || decline.isPending}>{t("requests.approve")}</DButton>
                  <DButton variant="outline" className="py-2" onClick={() => decline.mutate(r.id)} disabled={approve.isPending || decline.isPending}>{t("requests.decline")}</DButton>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </MotionItem>

      {/* History */}
      <MotionItem>
        <Panel className="p-6">
          <p className="font-medium tracking-tight mb-4">{t("requests.history")}</p>
          {resolved.length === 0 && <p className="text-sm text-white/40">{t("requests.empty")}</p>}
          <div className="space-y-1.5">
            {resolved.map((r) => {
              const st = STATUS[r.status] ?? { labelKey: r.status, tone: "muted" as const };
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl">
                  <p className="text-sm min-w-0 truncate"><TypeIcon type={r.type} />{childName(r.childId)}: {describe(r)}</p>
                  <DBadge tone={st.tone}>{t(st.labelKey)}</DBadge>
                </div>
              );
            })}
          </div>
        </Panel>
      </MotionItem>
    </MotionStagger>
  );
}
