"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatSum } from "@/lib/format";
import { childAuthService } from "@/lib/api";
import { useChildStore } from "@/store/child";

export default function KidChoresPage() {
  const { isChildAuthed } = useChildStore();
  const qc = useQueryClient();

  const { data: chores } = useQuery({
    queryKey: ["child-chores"],
    queryFn: async () => {
      const { data } = await childAuthService.myChores();
      return data.data;
    },
    enabled: isChildAuthed,
    refetchInterval: 15_000,
  });

  const completeChore = useMutation({
    mutationFn: (choreId: string) => childAuthService.completeChore(choreId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["child-chores"] }),
  });

  const active = chores?.filter((c) => c.status !== "REJECTED") ?? [];

  return (
    <div>
      <h2 className="text-base font-bold text-purple-800 mb-3 px-1">🎯 Мои задания</h2>
      {active.length === 0 && (
        <p className="text-gray-400 text-sm px-1">Пока заданий нет. Загляни позже! 🙂</p>
      )}
      <div className="space-y-2">
        {active.map((c) => {
          const meta: Record<string, { label: string; cls: string }> = {
            PENDING: { label: "Выполнить", cls: "" },
            DONE: { label: "На проверке ⏳", cls: "text-amber-600" },
            APPROVED: { label: "Готово ✅", cls: "text-green-600" },
          };
          const m = meta[c.status] ?? { label: c.status, cls: "" };
          return (
            <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-gray-800 truncate">{c.title}</p>
                <p className="text-sm text-purple-600 font-semibold">
                  +{formatSum(c.rewardAmount)}
                </p>
              </div>
              {c.status === "PENDING" ? (
                <button
                  onClick={() => completeChore.mutate(c.id)}
                  disabled={completeChore.isPending}
                  className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-full px-4 py-2"
                >
                  Выполнил! 🎉
                </button>
              ) : (
                <span className={`shrink-0 text-sm font-medium ${m.cls}`}>{m.label}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
