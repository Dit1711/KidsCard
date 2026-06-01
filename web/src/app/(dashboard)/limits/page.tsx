"use client";

import { useState, useEffect } from "react";
import { formatSum } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { familyService, limitService } from "@/lib/api";
import { useFamilyStore } from "@/store/family";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CATEGORIES, categoryLabel, PERIOD_LABELS } from "@/lib/categories";
import { toast } from "sonner";

const PERIOD_TYPES = [
  { value: "DAILY", label: PERIOD_LABELS.DAILY },
  { value: "WEEKLY", label: PERIOD_LABELS.WEEKLY },
  { value: "MONTHLY", label: PERIOD_LABELS.MONTHLY },
];

function periodLabel(type: string) {
  return PERIOD_TYPES.find((t) => t.value === type)?.label ?? type;
}

export default function LimitsPage() {
  const qc = useQueryClient();
  const { family } = useFamilyStore();

  const [selectedChild, setSelectedChild] = useState<string>("");
  // Period-limit form
  const [periodType, setPeriodType] = useState("DAILY");
  const [periodAmount, setPeriodAmount] = useState("");
  // Category-limit form
  const [catMcc, setCatMcc] = useState("");
  const [catAmount, setCatAmount] = useState("");

  const { data: children } = useQuery({
    queryKey: ["family-children", family?.id],
    queryFn: async () => {
      const { data } = await familyService.getChildren(family!.id);
      return data.data;
    },
    enabled: !!family?.id,
  });

  useEffect(() => {
    if (children && children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  const { data: limits } = useQuery({
    queryKey: ["limits", family?.id, selectedChild],
    queryFn: async () => {
      const { data } = await limitService.list(family!.id, selectedChild);
      return data.data;
    },
    enabled: !!family?.id && !!selectedChild,
  });

  const setLimit = useMutation({
    mutationFn: (p: { limitType: string; category?: string; amountUzs: number }) =>
      limitService.set(family!.id, selectedChild, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["limits", family!.id, selectedChild] });
      setPeriodAmount("");
      setCatAmount("");
      setCatMcc("");
      toast.success("Лимит установлен");
    },
    onError: () => toast.error("Не удалось установить лимит"),
  });

  const removeLimit = useMutation({
    mutationFn: (limitId: string) =>
      limitService.remove(family!.id, selectedChild, limitId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["limits", family!.id, selectedChild] });
      toast.success("Лимит удалён");
    },
  });

  if (!family) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Лимиты</h1>
        <p className="text-muted-foreground">Сначала создайте семью.</p>
      </div>
    );
  }

  const periodLimits = limits?.filter((l) => l.limitType !== "CATEGORY") ?? [];
  const categoryLimits = limits?.filter((l) => l.limitType === "CATEGORY") ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Лимиты трат</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Ограничьте расходы ребёнка по периодам и категориям
        </p>
      </div>

      {/* Child selector */}
      {children && children.length > 0 ? (
        <div className="flex gap-2 flex-wrap">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedChild(c.id)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedChild === c.id
                  ? "bg-primary text-white border-primary"
                  : "border-border hover:border-primary/40"
              }`}
            >
              {c.fullName}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Сначала добавьте детей в разделе «Семья».</p>
      )}

      {selectedChild && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Period limits ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Лимиты по периодам</CardTitle>
              <CardDescription>Сколько можно тратить за день/неделю/месяц</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {periodLimits.length === 0 && (
                  <p className="text-sm text-muted-foreground">Лимиты не установлены</p>
                )}
                {periodLimits.map((limit) => (
                  <div key={limit.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{periodLabel(limit.limitType)}</Badge>
                      <span className="text-sm font-medium">{formatSum(limit.amountUzs)}</span>
                    </div>
                    <button onClick={() => removeLimit.mutate(limit.id)} className="text-xs text-red-400 hover:text-red-600">
                      удалить
                    </button>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Период</Label>
                  <div className="flex gap-2 flex-wrap">
                    {PERIOD_TYPES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setPeriodType(t.value)}
                        className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                          periodType === t.value
                            ? "bg-primary text-white border-primary"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Сумма лимита (сум)</Label>
                  <Input type="number" placeholder="100000" value={periodAmount} onChange={(e) => setPeriodAmount(e.target.value)} />
                </div>
                <Button
                  onClick={() => setLimit.mutate({ limitType: periodType, amountUzs: Math.round(parseFloat(periodAmount)) })}
                  disabled={!periodAmount || setLimit.isPending}
                  className="w-full"
                >
                  {setLimit.isPending ? "Сохранение..." : "Установить лимит"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Category limits ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Лимиты по категориям</CardTitle>
              <CardDescription>Месячный потолок на категорию покупок</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {categoryLimits.length === 0 && (
                  <p className="text-sm text-muted-foreground">Категорийные лимиты не установлены</p>
                )}
                {categoryLimits.map((limit) => (
                  <div key={limit.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{categoryLabel(limit.category)}</Badge>
                      <span className="text-sm font-medium">
                        {formatSum(limit.amountUzs)} <span className="text-xs text-muted-foreground">/ мес</span>
                      </span>
                    </div>
                    <button onClick={() => removeLimit.mutate(limit.id)} className="text-xs text-red-400 hover:text-red-600">
                      удалить
                    </button>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Категория</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.mcc}
                        onClick={() => setCatMcc(c.mcc)}
                        className={`flex flex-col items-center gap-1 rounded-lg border py-2 transition-colors ${
                          catMcc === c.mcc
                            ? "border-primary bg-accent"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <span className="text-xl">{c.icon}</span>
                        <span className="text-[11px] text-muted-foreground">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Лимит в месяц (сум)</Label>
                  <Input type="number" placeholder="50000" value={catAmount} onChange={(e) => setCatAmount(e.target.value)} />
                </div>
                <Button
                  onClick={() => setLimit.mutate({ limitType: "CATEGORY", category: catMcc, amountUzs: Math.round(parseFloat(catAmount)) })}
                  disabled={!catAmount || !catMcc || setLimit.isPending}
                  className="w-full"
                >
                  {setLimit.isPending ? "Сохранение..." : "Установить лимит"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
