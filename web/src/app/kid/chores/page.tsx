"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatSum } from "@/lib/format";
import { childAuthService, type ChoreResponse } from "@/lib/api";
import { useChildStore } from "@/store/child";
import { KCard } from "@/components/kidkit";
import { Target, Zap, CheckCircle2, Camera } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/i18n/locale";

export default function KidChoresPage() {
  const { isChildAuthed } = useChildStore();
  const t = useT();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoChoreId = useRef<string | null>(null);

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
    mutationFn: ({ choreId, photo }: { choreId: string; photo?: File | null }) =>
      childAuthService.completeChore(choreId, photo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["child-chores"] });
      qc.invalidateQueries({ queryKey: ["child-gamification"] });
    },
    onError: (err: unknown) => {
      const code = (err as { response?: { data?: { error?: { code?: string } } } }).response?.data?.error?.code;
      toast.error(code === "PHOTO_REQUIRED" ? t("kidc.photoNeeded") : t("kidc.completeError"));
    },
  });

  function handleComplete(c: ChoreResponse) {
    if (c.requiresPhoto) {
      photoChoreId.current = c.id;
      fileInputRef.current?.click();
    } else {
      completeChore.mutate({ choreId: c.id });
    }
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    const choreId = photoChoreId.current;
    photoChoreId.current = null;
    if (file && choreId) completeChore.mutate({ choreId, photo: file });
  }

  const active = chores?.filter((c) => c.status !== "REJECTED") ?? [];

  return (
    <div>
      <h2 className="text-base font-bold mb-1 px-1 flex items-center gap-1.5"><Target className="h-4 w-4 text-fuchsia-300" /> {t("kid.nav.quests")}</h2>
      <p className="text-xs text-white/40 mb-3 px-1">{t("kidc.subtitle")}</p>

      {/* Hidden picker — opens the camera on mobile for photo-proof chores */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileChosen}
      />

      {active.length === 0 && (
        <p className="text-white/40 text-sm px-1">{t("kidc.empty")}</p>
      )}
      <div className="space-y-2">
        {active.map((c) => {
          const meta: Record<string, { label: string; cls: string }> = {
            PENDING: { label: "kidc.statusDo", cls: "" },
            DONE: { label: "kidc.statusReview", cls: "text-amber-300" },
            APPROVED: { label: "kidc.statusDone", cls: "text-emerald-300" },
          };
          const m = meta[c.status] ?? { label: c.status, cls: "" };
          return (
            <KCard key={c.id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-fuchsia-500/15 flex items-center justify-center shrink-0">
                  {c.status === "APPROVED" ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <Target className="h-5 w-5 text-fuchsia-300" />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate flex items-center gap-1.5">
                    {c.title}
                    {c.requiresPhoto && <Camera className="h-3.5 w-3.5 text-fuchsia-300 shrink-0" />}
                  </p>
                  <p className="text-sm text-fuchsia-300 font-semibold flex items-center gap-2">
                    +{formatSum(c.rewardAmount)}
                    <span className="inline-flex items-center gap-0.5 text-[11px] text-cyan-300"><Zap className="h-3 w-3" /> +50 XP</span>
                  </p>
                </div>
              </div>
              {c.status === "PENDING" ? (
                <button
                  onClick={() => handleComplete(c)}
                  disabled={completeChore.isPending}
                  className="shrink-0 inline-flex items-center gap-1.5 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-sm font-semibold rounded-full px-4 py-2 disabled:opacity-50"
                >
                  {c.requiresPhoto && <Camera className="h-4 w-4" />}
                  {t("kidc.didIt")}
                </button>
              ) : (
                <span className={`shrink-0 text-sm font-medium ${m.cls}`}>{t(m.label)}</span>
              )}
            </KCard>
          );
        })}
      </div>
    </div>
  );
}
