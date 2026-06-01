"use client";

import { useState, useEffect } from "react";
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

function formatSum(uzs: number) {
  return new Intl.NumberFormat("ru-UZ").format(uzs) + " сум";
}

const LIMIT_TYPES = [
  { value: "DAILY", label: "Дневной" },
  { value: "WEEKLY", label: "Недельный" },
  { value: "MONTHLY", label: "Месячный" },
  { value: "CATEGORY", label: "По категории" },
];

// Shared with the child shop — category = MCC.
const CATEGORIES = [
  { mcc: "5814", label: "Еда", icon: "🍔" },
  { mcc: "5816", label: "Игры", icon: "🎮" },
  { mcc: "5945", label: "Игрушки", icon: "🧸" },
  { mcc: "5999", label: "Другое", icon: "🛒" },
];

function categoryLabel(mcc: string | null) {
  const c = CATEGORIES.find((x) => x.mcc === mcc);
  return c ? `${c.icon} ${c.label}` : "Категория";
}

export default function LimitsPage() {
  const qc = useQueryClient();
  const { family } = useFamilyStore();

  const [selectedChild, setSelectedChild] = useState<string>("");
  const [limitType, setLimitType] = useState("DAILY");
  const [limitAmount, setLimitAmount] = useState("");
  const [limitCategory, setLimitCategory] = useState("");

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
    mutationFn: () =>
      limitService.set(family!.id, selectedChild, {
        limitType,
        category: limitType === "CATEGORY" ? limitCategory : undefined,
        amountUzs: Math.round(parseFloat(limitAmount)),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["limits", family!.id, selectedChild] });
      setLimitAmount("");
      setLimitCategory("");
    },
  });

  const removeLimit = useMutation({
    mutationFn: (limitId: string) =>
      limitService.remove(family!.id, selectedChild, limitId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["limits", family!.id, selectedChild] }),
  });

  if (!family) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Лимиты</h1>
        <p className="text-gray-400">Сначала создайте семью.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Лимиты трат</h1>
        <p className="text-gray-500 mt-1 text-sm">
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
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "border-gray-200 hover:border-indigo-300"
              }`}
            >
              {c.fullName}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-sm">Сначала добавьте детей в разделе «Семья».</p>
      )}

      {selectedChild && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="text-base">Лимиты трат</CardTitle>
            <CardDescription>Ограничьте расходы по периодам</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Active limits */}
            <div className="space-y-2">
              {limits?.length === 0 && (
                <p className="text-sm text-gray-400">Лимиты не установлены</p>
              )}
              {limits?.map((limit) => (
                <div
                  key={limit.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {limit.limitType === "CATEGORY"
                        ? categoryLabel(limit.category)
                        : LIMIT_TYPES.find((t) => t.value === limit.limitType)?.label ??
                          limit.limitType}
                    </Badge>
                    <span className="text-sm font-medium">
                      {formatSum(limit.amountUzs)}
                      {limit.limitType === "CATEGORY" && (
                        <span className="text-xs text-gray-400"> / мес</span>
                      )}
                    </span>
                  </div>
                  <button
                    onClick={() => removeLimit.mutate(limit.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    удалить
                  </button>
                </div>
              ))}
            </div>

            <Separator />

            {/* Add limit form */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Период</Label>
                <div className="flex gap-2 flex-wrap">
                  {LIMIT_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setLimitType(t.value)}
                      className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                        limitType === t.value
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "border-gray-200 hover:border-indigo-300"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {limitType === "CATEGORY" && (
                <div className="space-y-2">
                  <Label>Категория (лимит в месяц)</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.mcc}
                        onClick={() => setLimitCategory(c.mcc)}
                        className={`flex flex-col items-center gap-1 rounded-lg border py-2 transition-colors ${
                          limitCategory === c.mcc
                            ? "border-indigo-600 bg-indigo-50"
                            : "border-gray-200 hover:border-indigo-300"
                        }`}
                      >
                        <span className="text-xl">{c.icon}</span>
                        <span className="text-[11px] text-gray-600">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Сумма лимита (сум)</Label>
                <Input
                  type="number"
                  placeholder="100000"
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
                />
              </div>
              {setLimit.isError && (
                <p className="text-sm text-red-500">Ошибка установки лимита</p>
              )}
              <Button
                onClick={() => setLimit.mutate()}
                disabled={
                  !limitAmount ||
                  setLimit.isPending ||
                  (limitType === "CATEGORY" && !limitCategory)
                }
                className="w-full"
              >
                {setLimit.isPending ? "Сохранение..." : "Установить лимит"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
