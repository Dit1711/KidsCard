"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { choreService, familyService } from "@/lib/api";
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

function formatSum(uzs: number) {
  return new Intl.NumberFormat("ru-UZ").format(uzs) + " сум";
}

export default function ChoresPage() {
  const qc = useQueryClient();
  const { family } = useFamilyStore();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [reward, setReward] = useState("");
  const [childId, setChildId] = useState("");

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
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chores", family!.id] });
      setTitle("");
      setReward("");
      setChildId("");
      setShowCreate(false);
    },
  });

  const approve = useMutation({
    mutationFn: (choreId: string) => choreService.approve(family!.id, choreId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chores", family!.id] }),
  });

  const childName = (id: string) =>
    children?.find((c) => c.id === id)?.fullName ?? "Ребёнок";

  if (!family) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Задания</h1>
        <p className="text-gray-400">Сначала создайте семью.</p>
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
          <p className="text-gray-500 text-sm mt-1">
            Ставьте задания с наградой — за выполнение деньги падают на карту
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} variant={showCreate ? "outline" : "default"}>
          {showCreate ? "Отмена" : "+ Новое задание"}
        </Button>
      </div>

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
                  <button key={a} onClick={() => setReward(String(a))} className="px-2 py-1 text-xs border rounded hover:border-indigo-400">
                    {formatSum(a)}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={() => create.mutate()}
              disabled={!childId || !title || !reward || create.isPending}
              className="w-full"
            >
              {create.isPending ? "Создание…" : "Создать задание"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Awaiting approval */}
      {done.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-amber-700 mb-2">⏳ Ждут подтверждения</h2>
          <div className="space-y-2">
            {done.map((c) => (
              <Card key={c.id} className="border-amber-200 bg-amber-50">
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-gray-500">{childName(c.childId)} · награда {formatSum(c.rewardAmount)}</p>
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
        <h2 className="text-sm font-semibold text-gray-600 mb-2">📋 Активные</h2>
        {pending.length === 0 && <p className="text-gray-400 text-sm">Нет активных заданий</p>}
        <div className="space-y-2">
          {pending.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-gray-400">{childName(c.childId)}</p>
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
          <h2 className="text-sm font-semibold text-green-700 mb-2">✅ Выполнены</h2>
          <div className="space-y-2">
            {approved.map((c) => (
              <Card key={c.id} className="opacity-75">
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-gray-400">{childName(c.childId)} · награждено {formatSum(c.rewardAmount)}</p>
                  </div>
                  <span className="text-green-600 text-lg">✓</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
