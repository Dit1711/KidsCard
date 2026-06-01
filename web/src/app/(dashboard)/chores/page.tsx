"use client";

import { useState } from "react";
import { formatSum } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { choreService, familyService, paymentService, parentSavingsService } from "@/lib/api";
import { useFamilyStore } from "@/store/family";
import { toast } from "sonner";
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

export default function ChoresPage() {
  const qc = useQueryClient();
  const { family } = useFamilyStore();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [reward, setReward] = useState("");
  const [childId, setChildId] = useState("");
  const [recurrence, setRecurrence] = useState<"NONE" | "DAILY" | "WEEKLY">("NONE");
  const [createError, setCreateError] = useState("");

  const { data: wallet } = useQuery({
    queryKey: ["wallet", family?.id],
    queryFn: async () => {
      const { data } = await paymentService.getWallet(family!.id);
      return data.data;
    },
    enabled: !!family?.id,
    refetchInterval: 15_000,
  });

  const fundWallet = useMutation({
    mutationFn: (amount: number) => paymentService.fundWallet(family!.id, amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallet", family!.id] }),
  });

  const { data: children } = useQuery({
    queryKey: ["family-children", family?.id],
    queryFn: async () => {
      const { data } = await familyService.getChildren(family!.id);
      return data.data;
    },
    enabled: !!family?.id,
  });

  const { data: chores } = useQuery({
    queryKey: ["chores", family?.id],
    queryFn: async () => {
      const { data } = await choreService.list(family!.id);
      return data.data;
    },
    enabled: !!family?.id,
    refetchInterval: 15_000,
  });

  const create = useMutation({
    mutationFn: () =>
      choreService.create(family!.id, {
        title,
        childId,
        rewardAmount: Math.round(parseFloat(reward)),
        recurrence,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chores", family!.id] });
      qc.invalidateQueries({ queryKey: ["wallet", family!.id] });
      setTitle("");
      setReward("");
      setChildId("");
      setRecurrence("NONE");
      setCreateError("");
      setShowCreate(false);
      toast.success("Задание создано");
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: { code?: string; message?: string } } } };
      const msg = e.response?.data?.error?.message ?? "Не удалось создать задание";
      setCreateError(msg);
      toast.error(msg);
    },
  });

  const approve = useMutation({
    mutationFn: (choreId: string) => choreService.approve(family!.id, choreId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chores", family!.id] });
      qc.invalidateQueries({ queryKey: ["wallet", family!.id] });
      toast.success("Задание подтверждено — награда выдана");
    },
    onError: () => toast.error("Не удалось подтвердить задание"),
  });

  const { data: goals } = useQuery({
    queryKey: ["family-goals", family?.id],
    queryFn: async () => {
      const { data } = await parentSavingsService.list(family!.id);
      return data.data;
    },
    enabled: !!family?.id,
    refetchInterval: 15_000,
  });

  const gift = useMutation({
    mutationFn: ({ goalId, amount }: { goalId: string; amount: number }) =>
      parentSavingsService.contribute(family!.id, goalId, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-goals", family!.id] });
      qc.invalidateQueries({ queryKey: ["wallet", family!.id] });
    },
  });

  const childName = (id: string) =>
    children?.find((c) => c.id === id)?.fullName ?? "Ребёнок";

  const recurBadge = (r: string) =>
    r === "DAILY" ? "каждый день" : r === "WEEKLY" ? "каждую неделю" : null;

  if (!family) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Задания</h1>
        <p className="text-muted-foreground">Сначала создайте семью.</p>
      </div>
    );
  }

  const pending = chores?.filter((c) => c.status === "PENDING") ?? [];
  const done = chores?.filter((c) => c.status === "DONE") ?? [];
  const approved = chores?.filter((c) => c.status === "APPROVED") ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Задания</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ставьте задания с наградой — за выполнение деньги падают на карту
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} variant={showCreate ? "outline" : "default"}>
          {showCreate ? "Отмена" : "+ Новое задание"}
        </Button>
      </div>

      {/* Family wallet — rewards are reserved from here */}
      <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs">Кошелёк семьи</p>
              <p className="text-2xl font-bold">{formatSum(wallet?.availableUzs ?? 0)}</p>
              <p className="text-emerald-100 text-xs mt-1">
                доступно
                {wallet && wallet.heldUzs > 0 && ` · заморожено ${formatSum(wallet.heldUzs)}`}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {[50000, 100000, 200000].map((a) => (
                <button
                  key={a}
                  onClick={() => fundWallet.mutate(a)}
                  disabled={fundWallet.isPending}
                  className="rounded-md border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium hover:bg-white/20 transition-colors"
                >
                  + {formatSum(a)}
                </button>
              ))}
            </div>
          </div>
          <p className="text-emerald-100/80 text-[11px] mt-3">
            Награда замораживается в кошельке при создании задания — деньги гарантированно будут при выполнении.
          </p>
        </CardContent>
      </Card>

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Новое задание</CardTitle>
            <CardDescription>Награда зачислится после вашего подтверждения</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Кому</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
              >
                <option value="">Выберите ребёнка</option>
                {children?.map((c) => (
                  <option key={c.id} value={c.id}>{c.fullName}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Задание</Label>
              <Input placeholder="Убрать комнату" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Награда (сум)</Label>
              <Input type="number" placeholder="15000" value={reward} onChange={(e) => setReward(e.target.value)} />
              <div className="flex gap-2 flex-wrap">
                {[5000, 10000, 15000, 25000].map((a) => (
                  <button key={a} onClick={() => setReward(String(a))} className="px-2 py-1 text-xs border rounded hover:border-primary/50">
                    {formatSum(a)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Повтор</Label>
              <div className="flex gap-2">
                {[
                  { v: "NONE", l: "Разовое" },
                  { v: "DAILY", l: "Каждый день" },
                  { v: "WEEKLY", l: "Каждую неделю" },
                ].map((r) => (
                  <button
                    key={r.v}
                    onClick={() => setRecurrence(r.v as "NONE" | "DAILY" | "WEEKLY")}
                    className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                      recurrence === r.v
                        ? "border-primary bg-accent text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {r.l}
                  </button>
                ))}
              </div>
              {recurrence !== "NONE" && (
                <p className="text-[11px] text-muted-foreground">
                  После подтверждения задание появится снова — награда резервируется каждый раз.
                </p>
              )}
            </div>
            {createError && (
              <p className="text-sm text-red-500">{createError}</p>
            )}
            <Button
              onClick={() => create.mutate()}
              disabled={!childId || !title || !reward || create.isPending}
              className="w-full"
            >
              {create.isPending
                ? "Резервируем награду…"
                : "Создать задание"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Доступно в кошельке: {formatSum(wallet?.availableUzs ?? 0)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Awaiting approval */}
      {done.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-amber-700 mb-2">Ждут подтверждения</h2>
          <div className="space-y-2">
            {done.map((c) => (
              <Card key={c.id} className="border-amber-200 bg-amber-50">
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">
                      {c.title}
                      {c.recurrence !== "NONE" && (
                        <span className="ml-2 text-[11px] font-normal text-primary">{recurBadge(c.recurrence)}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{childName(c.childId)} · награда {formatSum(c.rewardAmount)}</p>
                  </div>
                  <Button size="sm" onClick={() => approve.mutate(c.id)} disabled={approve.isPending}>
                    Подтвердить и наградить
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Active */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">Активные</h2>
        {pending.length === 0 && <p className="text-muted-foreground text-sm">Нет активных заданий</p>}
        <div className="space-y-2">
          {pending.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">
                    {c.title}
                    {c.recurrence !== "NONE" && (
                      <span className="ml-2 text-[11px] font-normal text-primary">{recurBadge(c.recurrence)}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{childName(c.childId)}</p>
                </div>
                <Badge variant="secondary">{formatSum(c.rewardAmount)}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Done */}
      {approved.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-green-700 mb-2">Выполнены</h2>
          <div className="space-y-2">
            {approved.map((c) => (
              <Card key={c.id} className="opacity-75">
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{childName(c.childId)} · награждено {formatSum(c.rewardAmount)}</p>
                  </div>
                  <span className="text-green-600 text-lg">✓</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Children's savings goals — parent can chip in from the wallet */}
      {goals && goals.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-purple-700 mb-2">Цели детей</h2>
          <div className="space-y-2">
            {goals.map((g) => {
              const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
              const done = g.status === "COMPLETED";
              return (
                <Card key={g.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{done ? "" : ""}{g.title}</p>
                        <p className="text-xs text-muted-foreground">{childName(g.childId)}</p>
                      </div>
                      <p className="text-sm font-semibold text-purple-600">
                        {formatSum(g.currentAmount)} / {formatSum(g.targetAmount)}
                      </p>
                    </div>
                    <div className="h-2.5 rounded-full bg-purple-100 overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full ${done ? "bg-green-500" : "bg-purple-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {!done && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground mr-auto">Подкинуть из кошелька:</span>
                        {[10000, 25000, 50000].map((amt) => (
                          <button
                            key={amt}
                            onClick={() => gift.mutate({ goalId: g.id, amount: amt })}
                            disabled={gift.isPending || (wallet?.availableUzs ?? 0) < amt}
                            className="rounded-full border border-purple-200 text-purple-700 text-xs px-3 py-1 font-medium hover:bg-purple-50 disabled:opacity-40"
                          >
                            +{new Intl.NumberFormat("ru-UZ").format(amt)}
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
