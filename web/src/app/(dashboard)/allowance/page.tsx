"use client";

import { useState, useEffect } from "react";
import { formatSum } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { familyService, cardService, allowanceService } from "@/lib/api";
import { useFamilyStore } from "@/store/family";
import { Panel, DInput, DLabel, DButton, DBadge, Pill } from "@/components/dark";
import { MotionStagger, MotionItem } from "@/components/motion";
import { toast } from "sonner";

const WEEKDAYS = [
  { value: 1, label: "Пн" }, { value: 2, label: "Вт" }, { value: 3, label: "Ср" },
  { value: 4, label: "Чт" }, { value: 5, label: "Пт" }, { value: 6, label: "Сб" }, { value: 7, label: "Вс" },
];

export default function AllowancePage() {
  const qc = useQueryClient();
  const { family } = useFamilyStore();

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
      toast.success("Выплата настроена");
    },
    onError: () => toast.error("Ошибка настройки"),
  });

  if (!family) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Карманные деньги</h1>
        <p className="text-white/50">Сначала создайте семью.</p>
      </div>
    );
  }

  return (
    <MotionStagger className="space-y-6">
      <MotionItem>
        <h1 className="text-2xl font-bold tracking-tight">Карманные деньги</h1>
        <p className="text-white/50 mt-1 text-sm">Автоматическое пополнение карты по расписанию</p>
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
        <p className="text-white/50 text-sm">Сначала добавьте детей в разделе «Семья».</p>
      )}

      {selectedChild && (
        <MotionItem>
          <Panel className="p-6 max-w-xl space-y-4">
            {!childCard ? (
              <p className="text-sm text-white/50">У ребёнка нет карты. Выдайте карту в разделе «Карты».</p>
            ) : (
              <>
                {allowance ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-emerald-200 tabular-nums">{formatSum(allowance.amountUzs)}</span>
                      <DBadge tone="success">{allowance.frequency === "WEEKLY" ? "еженедельно" : "ежемесячно"}</DBadge>
                    </div>
                    {allowance.nextRunAt && (
                      <p className="text-xs text-emerald-300/70 mt-1">Следующее: {new Date(allowance.nextRunAt).toLocaleDateString("ru-RU")}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-white/40">Расписание не настроено</p>
                )}

                <div className="h-px bg-white/[0.06]" />

                <div className="space-y-3">
                  <div>
                    <DLabel>Частота</DLabel>
                    <div className="flex gap-2">
                      {[{ value: "WEEKLY", label: "Еженедельно" }, { value: "MONTHLY", label: "Ежемесячно" }].map((f) => (
                        <Pill key={f.value} active={allowanceFreq === f.value} onClick={() => setAllowanceFreq(f.value)}>{f.label}</Pill>
                      ))}
                    </div>
                  </div>

                  {allowanceFreq === "WEEKLY" && (
                    <div>
                      <DLabel>День недели</DLabel>
                      <div className="flex gap-1.5 flex-wrap">
                        {WEEKDAYS.map((d) => (
                          <button key={d.value} onClick={() => setAllowanceDow(d.value)}
                            className={`w-10 h-10 rounded-xl text-sm font-medium transition-colors ${
                              allowanceDow === d.value ? "bg-white/15 text-white" : "bg-white/[0.04] text-white/50 hover:text-white"
                            }`}>
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {allowanceFreq === "MONTHLY" && (
                    <p className="text-xs text-white/40">Пополнение 1-го числа каждого месяца</p>
                  )}

                  <div>
                    <DLabel>Сумма (сум)</DLabel>
                    <DInput type="number" placeholder="50000" value={allowanceAmount} onChange={(e) => setAllowanceAmount(e.target.value)} />
                  </div>

                  <DButton onClick={() => setAllowance.mutate()} disabled={!allowanceAmount || setAllowance.isPending} className="w-full">
                    {setAllowance.isPending ? "Сохранение…" : "Настроить выплату"}
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
