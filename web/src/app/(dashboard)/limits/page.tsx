"use client";

import { useState, useEffect } from "react";
import { formatSum } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { familyService, limitService } from "@/lib/api";
import { useFamilyStore } from "@/store/family";
import { CATEGORIES, categoryByMcc, PERIOD_LABELS } from "@/lib/categories";
import { Panel, DInput, DLabel, DButton, DBadge, Pill } from "@/components/dark";
import { MotionStagger, MotionItem } from "@/components/motion";
import { toast } from "sonner";
import { useT } from "@/i18n/locale";

const PERIOD_TYPES = [
  { value: "DAILY", label: PERIOD_LABELS.DAILY },
  { value: "WEEKLY", label: PERIOD_LABELS.WEEKLY },
  { value: "MONTHLY", label: PERIOD_LABELS.MONTHLY },
];
const periodLabel = (type: string) => PERIOD_TYPES.find((t) => t.value === type)?.label ?? type;

const Hr = () => <div className="h-px bg-white/[0.06]" />;

export default function LimitsPage() {
  const qc = useQueryClient();
  const { family } = useFamilyStore();
  const t = useT();

  const [selectedChild, setSelectedChild] = useState<string>("");
  const [periodType, setPeriodType] = useState("DAILY");
  const [periodAmount, setPeriodAmount] = useState("");
  const [catMcc, setCatMcc] = useState("");
  const [catAmount, setCatAmount] = useState("");

  const { data: children } = useQuery({
    queryKey: ["family-children", family?.id],
    queryFn: async () => (await familyService.getChildren(family!.id)).data.data,
    enabled: !!family?.id,
  });

  useEffect(() => {
    if (children && children.length > 0 && !selectedChild) setSelectedChild(children[0].id);
  }, [children, selectedChild]);

  const { data: limits } = useQuery({
    queryKey: ["limits", family?.id, selectedChild],
    queryFn: async () => (await limitService.list(family!.id, selectedChild)).data.data,
    enabled: !!family?.id && !!selectedChild,
  });

  const setLimit = useMutation({
    mutationFn: (p: { limitType: string; category?: string; amountUzs: number }) =>
      limitService.set(family!.id, selectedChild, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["limits", family!.id, selectedChild] });
      setPeriodAmount(""); setCatAmount(""); setCatMcc("");
      toast.success(t("limits.toastSet"));
    },
    onError: () => toast.error(t("limits.toastSetError")),
  });

  const removeLimit = useMutation({
    mutationFn: (limitId: string) => limitService.remove(family!.id, selectedChild, limitId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["limits", family!.id, selectedChild] }); toast(t("limits.toastRemoved")); },
  });

  if (!family) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">{t("nav.limits")}</h1>
        <p className="text-white/50">{t("cards.needFamily")}</p>
      </div>
    );
  }

  const periodLimits = limits?.filter((l) => l.limitType !== "CATEGORY") ?? [];
  const categoryLimits = limits?.filter((l) => l.limitType === "CATEGORY") ?? [];

  return (
    <MotionStagger className="space-y-6">
      <MotionItem>
        <h1 className="text-2xl font-bold tracking-tight">{t("limits.title")}</h1>
        <p className="text-white/50 mt-1 text-sm">{t("limits.subtitle")}</p>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Period limits */}
            <Panel className="p-6 space-y-4">
              <div>
                <p className="font-medium tracking-tight">{t("limits.periodTitle")}</p>
                <p className="text-xs text-white/40">{t("limits.periodHint")}</p>
              </div>
              <div className="space-y-2">
                {periodLimits.length === 0 && <p className="text-sm text-white/40">{t("limits.noPeriod")}</p>}
                {periodLimits.map((limit) => (
                  <div key={limit.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.05]">
                    <div className="flex items-center gap-2">
                      <DBadge tone="muted">{periodLabel(limit.limitType)}</DBadge>
                      <span className="text-sm font-medium tabular-nums">{formatSum(limit.amountUzs)}</span>
                    </div>
                    <button onClick={() => removeLimit.mutate(limit.id)} className="text-xs text-rose-300/80 hover:text-rose-300">{t("common.remove")}</button>
                  </div>
                ))}
              </div>
              <Hr />
              <div className="space-y-3">
                <div>
                  <DLabel>{t("limits.period")}</DLabel>
                  <div className="flex gap-2 flex-wrap">
                    {PERIOD_TYPES.map((pt) => (
                      <Pill key={pt.value} active={periodType === pt.value} onClick={() => setPeriodType(pt.value)}>{pt.label}</Pill>
                    ))}
                  </div>
                </div>
                <div>
                  <DLabel>{t("limits.amountLabel")}</DLabel>
                  <DInput type="number" placeholder="100000" value={periodAmount} onChange={(e) => setPeriodAmount(e.target.value)} />
                </div>
                <DButton onClick={() => setLimit.mutate({ limitType: periodType, amountUzs: Math.round(parseFloat(periodAmount)) })}
                  disabled={!periodAmount || setLimit.isPending} className="w-full">
                  {setLimit.isPending ? t("common.saving") : t("limits.set")}
                </DButton>
              </div>
            </Panel>

            {/* Category limits */}
            <Panel className="p-6 space-y-4">
              <div>
                <p className="font-medium tracking-tight">{t("limits.catTitle")}</p>
                <p className="text-xs text-white/40">{t("limits.catHint")}</p>
              </div>
              <div className="space-y-2">
                {categoryLimits.length === 0 && <p className="text-sm text-white/40">{t("limits.noCat")}</p>}
                {categoryLimits.map((limit) => (
                  <div key={limit.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.05]">
                    <div className="flex items-center gap-2">
                      {(() => { const m = categoryByMcc(limit.category); return (
                        <DBadge tone="muted"><span className="flex items-center gap-1.5"><m.Icon className="h-3.5 w-3.5" /> {m.label}</span></DBadge>
                      ); })()}
                      <span className="text-sm font-medium tabular-nums">{formatSum(limit.amountUzs)} <span className="text-xs text-white/40">{t("limits.perMonth")}</span></span>
                    </div>
                    <button onClick={() => removeLimit.mutate(limit.id)} className="text-xs text-rose-300/80 hover:text-rose-300">{t("common.remove")}</button>
                  </div>
                ))}
              </div>
              <Hr />
              <div className="space-y-3">
                <div>
                  <DLabel>{t("limits.category")}</DLabel>
                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map((c) => (
                      <button key={c.mcc} onClick={() => setCatMcc(c.mcc)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl py-3 transition-colors ${
                          catMcc === c.mcc ? "bg-white/15 ring-1 ring-fuchsia-400/50" : "bg-white/[0.04] hover:bg-white/[0.08]"
                        }`}>
                        <c.Icon className="h-5 w-5 text-white/70" />
                        <span className="text-[11px] text-white/50">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <DLabel>{t("limits.catAmountLabel")}</DLabel>
                  <DInput type="number" placeholder="50000" value={catAmount} onChange={(e) => setCatAmount(e.target.value)} />
                </div>
                <DButton onClick={() => setLimit.mutate({ limitType: "CATEGORY", category: catMcc, amountUzs: Math.round(parseFloat(catAmount)) })}
                  disabled={!catAmount || !catMcc || setLimit.isPending} className="w-full">
                  {setLimit.isPending ? t("common.saving") : t("limits.set")}
                </DButton>
              </div>
            </Panel>
          </div>
        </MotionItem>
      )}
    </MotionStagger>
  );
}
