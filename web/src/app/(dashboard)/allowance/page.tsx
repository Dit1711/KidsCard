"use client";

import { useState, useEffect } from "react";
import { formatSum } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { familyService, cardService, allowanceService } from "@/lib/api";
import { useFamilyStore } from "@/store/family";
import { Panel, DInput, DLabel, DButton, DBadge, Pill } from "@/components/dark";
import { MotionStagger, MotionItem } from "@/components/motion";
import { toast } from "sonner";
import { useT } from "@/i18n/locale";

const WEEKDAYS = [
  { value: 1, label: "allowance.dowMon" }, { value: 2, label: "allowance.dowTue" }, { value: 3, label: "allowance.dowWed" },
  { value: 4, label: "allowance.dowThu" }, { value: 5, label: "allowance.dowFri" }, { value: 6, label: "allowance.dowSat" }, { value: 7, label: "allowance.dowSun" },
];

export default function AllowancePage() {
  const qc = useQueryClient();
  const { family } = useFamilyStore();
  const t = useT();

  const [selectedChild, setSelectedChild] = useState<string>("");
  const [allowanceAmount, setAllowanceAmount] = useState("");
  const [allowanceFreq, setAllowanceFreq] = useState("WEEKLY");
  const [allowanceDow, setAllowanceDow] = useState(1);

  const { data: children } = useQuery({
    queryKey: ["family-children", family?.id],
    queryFn: async () => (await familyService.getChildren(family!.id)).data.data,
    enabled: !!family?.id,
  });

  useEffect(() => {
    if (children && children.length > 0 && !selectedChild) setSelectedChild(children[0].id);
  }, [children, selectedChild]);

  const { data: cards } = useQuery({
    queryKey: ["family-cards", family?.id],
    queryFn: async () => (await cardService.getByFamily(family!.id)).data.data,
    enabled: !!family?.id,
  });

  const childCard = cards?.find((c) => c.childId === selectedChild);

  const { data: allowance } = useQuery({
    queryKey: ["allowance", family?.id, childCard?.id],
    queryFn: async () => (await allowanceService.getActive(family!.id, childCard!.id)).data.data ?? null,
    enabled: !!family?.id && !!childCard?.id,
  });

  const setAllowance = useMutation({
    mutationFn: () =>
      allowanceService.set(family!.id, childCard!.id, {
        amountUzs: Math.round(parseFloat(allowanceAmount)),
        frequency: allowanceFreq,
        dayOfWeek: allowanceFreq === "WEEKLY" ? allowanceDow : undefined,
        dayOfMonth: allowanceFreq === "MONTHLY" ? 1 : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allowance", family!.id, childCard!.id] });
      setAllowanceAmount("");
      toast.success(t("allowance.toastSet"));
    },
    onError: () => toast.error(t("allowance.toastSetError")),
  });

  if (!family) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">{t("nav.allowance")}</h1>
        <p className="text-white/50">{t("cards.needFamily")}</p>
      </div>
    );
  }

  return (
    <MotionStagger className="space-y-6">
      <MotionItem>
        <h1 className="text-2xl font-bold tracking-tight">{t("nav.allowance")}</h1>
        <p className="text-white/50 mt-1 text-sm">{t("allowance.subtitle")}</p>
      </MotionItem>

      {children && children.length > 0 ? (
        <MotionItem>
          <div className="flex gap-2 flex-wrap">
            {children.map((c) => (
              <Pill key={c.id} active={selectedChild === c.id} onClick={() => setSelectedChild(c.id)}>{c.fullName}</Pill>
            ))}
          </div>
        </MotionItem>
      ) : (
        <p className="text-white/50 text-sm">{t("limits.needChildren")}</p>
      )}

      {selectedChild && (
        <MotionItem>
          <Panel className="p-6 max-w-xl space-y-4">
            {!childCard ? (
              <p className="text-sm text-white/50">{t("allowance.noCard")}</p>
            ) : (
              <>
                {allowance ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-emerald-200 tabular-nums">{formatSum(allowance.amountUzs)}</span>
                      <DBadge tone="success">{allowance.frequency === "WEEKLY" ? t("allowance.weekly") : t("allowance.monthly")}</DBadge>
                    </div>
                    {allowance.nextRunAt && (
                      <p className="text-xs text-emerald-300/70 mt-1">{t("allowance.next", { date: new Date(allowance.nextRunAt).toLocaleDateString() })}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-white/40">{t("allowance.noSchedule")}</p>
                )}

                <div className="h-px bg-white/[0.06]" />

                <div className="space-y-3">
                  <div>
                    <DLabel>{t("allowance.frequency")}</DLabel>
                    <div className="flex gap-2">
                      {[{ value: "WEEKLY", label: "allowance.weeklyCap" }, { value: "MONTHLY", label: "allowance.monthlyCap" }].map((f) => (
                        <Pill key={f.value} active={allowanceFreq === f.value} onClick={() => setAllowanceFreq(f.value)}>{t(f.label)}</Pill>
                      ))}
                    </div>
                  </div>

                  {allowanceFreq === "WEEKLY" && (
                    <div>
                      <DLabel>{t("allowance.dayOfWeek")}</DLabel>
                      <div className="flex gap-1.5 flex-wrap">
                        {WEEKDAYS.map((d) => (
                          <button key={d.value} onClick={() => setAllowanceDow(d.value)}
                            className={`w-10 h-10 rounded-xl text-sm font-medium transition-colors ${
                              allowanceDow === d.value ? "bg-white/15 text-white" : "bg-white/[0.04] text-white/50 hover:text-white"
                            }`}>
                            {t(d.label)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {allowanceFreq === "MONTHLY" && (
                    <p className="text-xs text-white/40">{t("allowance.monthlyHint")}</p>
                  )}

                  <div>
                    <DLabel>{t("banks.amount")}</DLabel>
                    <DInput type="number" placeholder="50000" value={allowanceAmount} onChange={(e) => setAllowanceAmount(e.target.value)} />
                  </div>

                  <DButton onClick={() => setAllowance.mutate()} disabled={!allowanceAmount || setAllowance.isPending} className="w-full">
                    {setAllowance.isPending ? t("common.saving") : t("allowance.set")}
                  </DButton>
                </div>
              </>
            )}
          </Panel>
        </MotionItem>
      )}
    </MotionStagger>
  );
}
