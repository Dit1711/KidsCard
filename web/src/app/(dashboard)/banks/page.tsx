"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  openBankingService,
  familyService,
  cardService,
} from "@/lib/api";
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

function formatSum(uzs: number | null) {
  if (uzs == null) return "—";
  return new Intl.NumberFormat("ru-UZ").format(uzs) + " сум";
}

export default function BanksPage() {
  const qc = useQueryClient();
  const { family } = useFamilyStore();

  const [fundAccount, setFundAccount] = useState<string | null>(null);
  const [fundChild, setFundChild] = useState("");
  const [fundAmount, setFundAmount] = useState("");
  const [fundMsg, setFundMsg] = useState("");

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data } = await openBankingService.accounts();
      return data.data;
    },
  });

  const { data: banks } = useQuery({
    queryKey: ["banks"],
    queryFn: async () => {
      const { data } = await openBankingService.banks();
      return data.data;
    },
  });

  const { data: children } = useQuery({
    queryKey: ["family-children", family?.id],
    queryFn: async () => {
      const { data } = await familyService.getChildren(family!.id);
      return data.data;
    },
    enabled: !!family?.id,
  });

  const { data: cards } = useQuery({
    queryKey: ["family-cards", family?.id],
    queryFn: async () => {
      const { data } = await cardService.getByFamily(family!.id);
      return data.data;
    },
    enabled: !!family?.id,
  });

  const link = useMutation({
    mutationFn: (bankCode: string) => openBankingService.link(bankCode),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bank-accounts"] }),
  });

  const fund = useMutation({
    mutationFn: () => {
      const card = cards?.find((c) => c.childId === fundChild);
      return openBankingService.fundCard({
        accountId: fundAccount!,
        cardId: card!.id,
        childId: fundChild,
        familyId: family!.id,
        amountUzs: Math.round(parseFloat(fundAmount)),
        idempotencyKey: `ob-${fundAccount}-${Date.now()}`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      qc.invalidateQueries({ queryKey: ["balance"] });
      setFundMsg("✅ Карта пополнена. Баланс обновится в течение пары секунд.");
      setFundAmount("");
      setFundChild("");
      setFundAccount(null);
    },
    onError: () => setFundMsg("❌ Не удалось пополнить. Проверьте баланс счёта."),
  });

  const childrenWithCards = children?.filter((c) =>
    cards?.some((card) => card.childId === c.id)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Банковские счета</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Open Banking: привяжите счёт и пополняйте карты детей напрямую
        </p>
      </div>

      {isLoading && <p className="text-gray-400">Загрузка…</p>}

      {/* No accounts → link */}
      {accounts && accounts.length === 0 && (
        <Card className="border-dashed border-2 border-indigo-200">
          <CardContent className="flex flex-col items-center py-10 gap-4">
            <span className="text-4xl">🏦</span>
            <p className="text-gray-500">Нет привязанных счетов</p>
            <div className="flex gap-2">
              {banks?.map((b) => (
                <Button
                  key={b.code}
                  onClick={() => link.mutate(b.code)}
                  disabled={link.isPending}
                >
                  {link.isPending ? "Привязка…" : `Привязать ${b.name}`}
                </Button>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              В демо-режиме банк авторизует доступ автоматически
            </p>
          </CardContent>
        </Card>
      )}

      {/* Accounts */}
      {accounts && accounts.length > 0 && (
        <div className="space-y-4">
          {accounts.map((acc) => (
            <Card key={acc.id}>
              <CardContent className="pt-5 pb-5">
                <div className="rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white p-4 mb-4">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-xs text-slate-300">{acc.bankCode} · {acc.accountType}</p>
                      <p className="font-semibold">{acc.holderName ?? "Счёт"}</p>
                    </div>
                    <Badge variant="outline" className="border-white/30 text-green-300 text-xs">
                      {acc.status}
                    </Badge>
                  </div>
                  <p className="font-mono text-lg tracking-widest mb-3">{acc.maskedNumber}</p>
                  <div className="flex justify-between items-end">
                    <span className="text-slate-300 text-sm">Доступно</span>
                    <span className="font-bold text-xl">{formatSum(acc.balanceUzs)}</span>
                  </div>
                </div>

                <Button
                  variant={fundAccount === acc.id ? "outline" : "default"}
                  onClick={() => {
                    setFundAccount(fundAccount === acc.id ? null : acc.id);
                    setFundMsg("");
                  }}
                  className="w-full"
                >
                  {fundAccount === acc.id ? "Отмена" : "Пополнить карту ребёнка"}
                </Button>

                {fundAccount === acc.id && (
                  <div className="mt-4 space-y-3">
                    <Separator />
                    <div className="space-y-2">
                      <Label>Ребёнок (карта)</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={fundChild}
                        onChange={(e) => setFundChild(e.target.value)}
                      >
                        <option value="">Выберите ребёнка</option>
                        {childrenWithCards?.map((c) => (
                          <option key={c.id} value={c.id}>{c.fullName}</option>
                        ))}
                      </select>
                      {childrenWithCards?.length === 0 && (
                        <p className="text-xs text-amber-600">
                          Ни у кого нет карты — выпустите карту в разделе «Карты».
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Сумма (сум)</Label>
                      <Input
                        type="number"
                        placeholder="100000"
                        value={fundAmount}
                        onChange={(e) => setFundAmount(e.target.value)}
                      />
                      <div className="flex gap-2 flex-wrap">
                        {[50000, 100000, 200000, 500000].map((amt) => (
                          <button
                            key={amt}
                            onClick={() => setFundAmount(String(amt))}
                            className="px-2 py-1 text-xs border rounded hover:border-indigo-400 transition-colors"
                          >
                            {formatSum(amt)}
                          </button>
                        ))}
                      </div>
                    </div>
                    {fundMsg && <p className="text-sm">{fundMsg}</p>}
                    <Button
                      onClick={() => fund.mutate()}
                      disabled={!fundChild || !fundAmount || fund.isPending}
                      className="w-full"
                    >
                      {fund.isPending
                        ? "Перевод…"
                        : `Перевести ${fundAmount ? formatSum(parseFloat(fundAmount)) : ""}`}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {fundMsg && !fundAccount && (
            <p className="text-sm text-green-600">{fundMsg}</p>
          )}
        </div>
      )}
    </div>
  );
}
