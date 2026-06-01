"use client";

import { useState, useEffect } from "react";
import { formatSum } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { familyService, cardService, allowanceService } from "@/lib/api";
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

const WEEKDAYS = [
  { value: 1, label: "Пн" },
  { value: 2, label: "Вт" },
  { value: 3, label: "Ср" },
  { value: 4, label: "Чт" },
  { value: 5, label: "Пт" },
  { value: 6, label: "Сб" },
  { value: 7, label: "Вс" },
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

  const { data: cards } = useQuery({
    queryKey: ["family-cards", family?.id],
    queryFn: async () => {
      const { data } = await cardService.getByFamily(family!.id);
      return data.data;
    },
    enabled: !!family?.id,
  });

  const childCard = cards?.find((c) => c.childId === selectedChild);

  const { data: allowance } = useQuery({
    queryKey: ["allowance", family?.id, childCard?.id],
    queryFn: async () => {
      const { data } = await allowanceService.getActive(family!.id, childCard!.id);
      return data.data ?? null;
    },
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
    },
  });

  if (!family) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Карманные деньги</h1>
        <p className="text-gray-400">Сначала создайте семью.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Карманные деньги</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Автоматическое пополнение карты по расписанию
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
            <CardTitle className="text-base">Карманные деньги</CardTitle>
            <CardDescription>
              Автоматическое пополнение карты по расписанию
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!childCard ? (
              <p className="text-sm text-gray-400">
                У ребёнка нет карты. Выдайте карту в разделе «Карты».
              </p>
            ) : (
              <>
                {/* Current allowance */}
                {allowance ? (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-800">
                        {formatSum(allowance.amountUzs)}
                      </span>
                      <Badge variant="secondary">
                        {allowance.frequency === "WEEKLY" ? "еженедельно" : "ежемесячно"}
                      </Badge>
                    </div>
                    {allowance.nextRunAt && (
                      <p className="text-xs text-green-600 mt-1">
                        Следующее: {new Date(allowance.nextRunAt).toLocaleDateString("ru-RU")}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Расписание не настроено</p>
                )}

                <Separator />

                {/* Set allowance form */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Частота</Label>
                    <div className="flex gap-2">
                      {[
                        { value: "WEEKLY", label: "Еженедельно" },
                        { value: "MONTHLY", label: "Ежемесячно" },
                      ].map((f) => (
                        <button
                          key={f.value}
                          onClick={() => setAllowanceFreq(f.value)}
                          className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                            allowanceFreq === f.value
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "border-gray-200 hover:border-indigo-300"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {allowanceFreq === "WEEKLY" && (
                    <div className="space-y-2">
                      <Label>День недели</Label>
                      <div className="flex gap-1 flex-wrap">
                        {WEEKDAYS.map((d) => (
                          <button
                            key={d.value}
                            onClick={() => setAllowanceDow(d.value)}
                            className={`w-9 h-9 rounded-md text-sm border transition-colors ${
                              allowanceDow === d.value
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "border-gray-200 hover:border-indigo-300"
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {allowanceFreq === "MONTHLY" && (
                    <p className="text-xs text-gray-400">
                      Пополнение 1-го числа каждого месяца
                    </p>
                  )}

                  <div className="space-y-2">
                    <Label>Сумма (сум)</Label>
                    <Input
                      type="number"
                      placeholder="50000"
                      value={allowanceAmount}
                      onChange={(e) => setAllowanceAmount(e.target.value)}
                    />
                  </div>

                  {setAllowance.isError && (
                    <p className="text-sm text-red-500">Ошибка настройки</p>
                  )}
                  <Button
                    onClick={() => setAllowance.mutate()}
                    disabled={!allowanceAmount || setAllowance.isPending}
                    className="w-full"
                  >
                    {setAllowance.isPending ? "Сохранение..." : "Настроить выплату"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
