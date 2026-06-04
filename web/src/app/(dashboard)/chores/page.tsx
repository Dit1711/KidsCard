"use client";

import { useState } from "react";
import { formatSum } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { choreService, familyService, paymentService, parentSavingsService } from "@/lib/api";
import { useFamilyStore } from "@/store/family";
import { toast } from "sonner";
import { Panel, DInput, DLabel, DButton, DBadge, DSelect } from "@/components/dark";
import { MotionStagger, MotionItem } from "@/components/motion";
import { Plus, Wallet, Check, Repeat } from "lucide-react";
import { useT } from "@/i18n/locale";

export default function ChoresPage() {
  const qc = useQueryClient();
  const { family } = useFamilyStore();
  const t = useT();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [reward, setReward] = useState("");
  const [childId, setChildId] = useState("");
  const [recurrence, setRecurrence] = useState<"NONE" | "DAILY" | "WEEKLY">("NONE");
  const [createError, setCreateError] = useState("");

  const { data: wallet } = useQuery({
    queryKey: ["wallet", family?.id],
    queryFn: async () => (await paymentService.getWallet(family!.id)).data.data,
    enabled: !!family?.id,
    refetchInterval: 15_000,
  });

  const fundWallet = useMutation({
    mutationFn: (amount: number) => paymentService.fundWallet(family!.id, amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallet", family!.id] }),
  });

  const { data: children } = useQuery({
    queryKey: ["family-children", family?.id],
    queryFn: async () => (await familyService.getChildren(family!.id)).data.data,
    enabled: !!family?.id,
  });

  const { data: chores } = useQuery({
    queryKey: ["chores", family?.id],
    queryFn: async () => (await choreService.list(family!.id)).data.data,
    enabled: !!family?.id,
    refetchInterval: 15_000,
  });

  const create = useMutation({
    mutationFn: () =>
      choreService.create(family!.id, { title, childId, rewardAmount: Math.round(parseFloat(reward)), recurrence }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chores", family!.id] });
      qc.invalidateQueries({ queryKey: ["wallet", family!.id] });
      setTitle(""); setReward(""); setChildId(""); setRecurrence("NONE"); setCreateError(""); setShowCreate(false);
      toast.success(t("chores.toastCreated"));
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      const msg = e.response?.data?.error?.message ?? t("chores.toastCreateError");
      setCreateError(msg); toast.error(msg);
    },
  });

  const approve = useMutation({
    mutationFn: (choreId: string) => choreService.approve(family!.id, choreId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chores", family!.id] });
      qc.invalidateQueries({ queryKey: ["wallet", family!.id] });
      toast.success(t("chores.toastApproved"));
    },
    onError: () => toast.error(t("chores.toastApproveError")),
  });

  const { data: goals } = useQuery({
    queryKey: ["family-goals", family?.id],
    queryFn: async () => (await parentSavingsService.list(family!.id)).data.data,
    enabled: !!family?.id,
    refetchInterval: 15_000,
  });

  const gift = useMutation({
    mutationFn: ({ goalId, amount }: { goalId: string; amount: number }) =>
      parentSavingsService.contribute(family!.id, goalId, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-goals", family!.id] });
      qc.invalidateQueries({ queryKey: ["wallet", family!.id] });
      toast.success(t("chores.toastGifted"));
    },
  });

  const childName = (id: string) => children?.find((c) => c.id === id)?.fullName ?? t("common.child");
  const recurBadge = (r: string) => (r === "DAILY" ? t("chores.recurDaily") : r === "WEEKLY" ? t("chores.recurWeekly") : null);

  if (!family) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">{t("nav.chores")}</h1>
        <p className="text-white/50">{t("cards.needFamily")}</p>
      </div>
    );
  }

  const pending = chores?.filter((c) => c.status === "PENDING") ?? [];
  const done = chores?.filter((c) => c.status === "DONE") ?? [];
  const approved = chores?.filter((c) => c.status === "APPROVED") ?? [];

  return (
    <MotionStagger className="space-y-6">
      <MotionItem>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("nav.chores")}</h1>
            <p className="text-white/50 text-sm mt-1">{t("chores.subtitle")}</p>
          </div>
          <DButton variant={showCreate ? "outline" : "primary"} onClick={() => setShowCreate(!showCreate)} className="shrink-0">
            {showCreate ? t("common.cancel") : <><Plus className="h-4 w-4" /> {t("chores.new")}</>}
          </DButton>
        </div>
      </MotionItem>

      {/* Family wallet */}
      <MotionItem>
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-50/80 text-xs"><Wallet className="h-4 w-4" /> {t("chores.wallet")}</div>
              <p className="text-3xl font-bold tabular-nums mt-1">{formatSum(wallet?.availableUzs ?? 0)}</p>
              <p className="text-emerald-50/70 text-xs mt-1">
                {t("chores.available")}{wallet && wallet.heldUzs > 0 && ` ${t("chores.held", { sum: formatSum(wallet.heldUzs) })}`}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {[50000, 100000, 200000].map((a) => (
                <button key={a} onClick={() => fundWallet.mutate(a)} disabled={fundWallet.isPending}
                  className="rounded-xl bg-white/15 hover:bg-white/25 px-3 py-1.5 text-xs font-medium transition-colors">
                  + {formatSum(a)}
                </button>
              ))}
            </div>
          </div>
          <p className="text-emerald-50/70 text-[11px] mt-3">
            {t("chores.walletHint")}
          </p>
        </div>
      </MotionItem>

      {showCreate && (
        <MotionItem>
          <Panel className="p-5 space-y-3">
            <p className="font-medium tracking-tight">{t("chores.newChore")}</p>
            <div>
              <DLabel>{t("chores.assignee")}</DLabel>
              <DSelect value={childId} onChange={(e) => setChildId(e.target.value)}>
                <option value="">{t("cards.selectChild")}</option>
                {children?.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
              </DSelect>
            </div>
            <div>
              <DLabel>{t("chores.choreLabel")}</DLabel>
              <DInput placeholder={t("chores.chorePlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <DLabel>{t("chores.reward")}</DLabel>
              <DInput type="number" placeholder="15000" value={reward} onChange={(e) => setReward(e.target.value)} />
              <div className="flex gap-2 flex-wrap mt-2">
                {[5000, 10000, 15000, 25000].map((a) => (
                  <button key={a} onClick={() => setReward(String(a))}
                    className="px-2.5 py-1 text-xs rounded-lg bg-white/[0.05] text-white/60 hover:text-white transition-colors">
                    {formatSum(a)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <DLabel>{t("chores.repeat")}</DLabel>
              <div className="flex gap-2">
                {[{ v: "NONE", l: "chores.once" }, { v: "DAILY", l: "chores.daily" }, { v: "WEEKLY", l: "chores.weekly" }].map((r) => (
                  <button key={r.v} onClick={() => setRecurrence(r.v as "NONE" | "DAILY" | "WEEKLY")}
                    className={`flex-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors ${
                      recurrence === r.v ? "bg-white/15 text-white" : "bg-white/[0.04] text-white/50 hover:text-white"
                    }`}>
                    {t(r.l)}
                  </button>
                ))}
              </div>
              {recurrence !== "NONE" && (
                <p className="text-[11px] text-white/40 mt-1.5">{t("chores.recurHint")}</p>
              )}
            </div>
            {createError && <p className="text-sm text-rose-300 bg-rose-500/10 rounded-lg px-3 py-2">{createError}</p>}
            <DButton onClick={() => create.mutate()} disabled={!childId || !title || !reward || create.isPending} className="w-full">
              {create.isPending ? t("chores.reserving") : t("chores.create")}
            </DButton>
            <p className="text-xs text-white/40 text-center">{t("chores.availableInWallet", { sum: formatSum(wallet?.availableUzs ?? 0) })}</p>
          </Panel>
        </MotionItem>
      )}

      {/* Awaiting approval */}
      {done.length > 0 && (
        <MotionItem>
          <h2 className="text-sm font-semibold text-amber-300 mb-2">{t("chores.awaiting")}</h2>
          <div className="space-y-2.5">
            {done.map((c) => (
              <Panel key={c.id} className="p-4 border-amber-500/20 bg-amber-500/[0.06] flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {c.title}
                    {c.recurrence !== "NONE" && <span className="ml-2 text-[11px] font-normal text-fuchsia-300 inline-flex items-center gap-1"><Repeat className="h-3 w-3" /> {recurBadge(c.recurrence)}</span>}
                  </p>
                  <p className="text-xs text-white/40">{childName(c.childId)} · {t("chores.rewardWord")} {formatSum(c.rewardAmount)}</p>
                </div>
                <DButton onClick={() => approve.mutate(c.id)} disabled={approve.isPending} className="shrink-0 py-2">
                  {t("chores.confirm")}
                </DButton>
              </Panel>
            ))}
          </div>
        </MotionItem>
      )}

      {/* Active */}
      <MotionItem>
        <h2 className="text-sm font-semibold text-white/50 mb-2">{t("chores.active")}</h2>
        {pending.length === 0 && <p className="text-white/40 text-sm">{t("chores.noActive")}</p>}
        <div className="space-y-2.5">
          {pending.map((c) => (
            <Panel key={c.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">
                  {c.title}
                  {c.recurrence !== "NONE" && <span className="ml-2 text-[11px] font-normal text-fuchsia-300 inline-flex items-center gap-1"><Repeat className="h-3 w-3" /> {recurBadge(c.recurrence)}</span>}
                </p>
                <p className="text-xs text-white/40">{childName(c.childId)}</p>
              </div>
              <DBadge tone="muted">{formatSum(c.rewardAmount)}</DBadge>
            </Panel>
          ))}
        </div>
      </MotionItem>

      {/* Done */}
      {approved.length > 0 && (
        <MotionItem>
          <h2 className="text-sm font-semibold text-emerald-300 mb-2">{t("chores.completed")}</h2>
          <div className="space-y-2.5">
            {approved.map((c) => (
              <Panel key={c.id} className="p-4 opacity-70 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-white/40">{childName(c.childId)} · {t("chores.rewardedWord")} {formatSum(c.rewardAmount)}</p>
                </div>
                <Check className="h-5 w-5 text-emerald-400" />
              </Panel>
            ))}
          </div>
        </MotionItem>
      )}

      {/* Children's goals */}
      {goals && goals.length > 0 && (
        <MotionItem>
          <h2 className="text-sm font-semibold text-fuchsia-300 mb-2">{t("chores.kidsGoals")}</h2>
          <div className="space-y-2.5">
            {goals.map((g) => {
              const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
              const isDone = g.status === "COMPLETED";
              return (
                <Panel key={g.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">{g.title}</p>
                      <p className="text-xs text-white/40">{childName(g.childId)}</p>
                    </div>
                    <p className="text-sm font-semibold text-white/80 tabular-nums">{formatSum(g.currentAmount)} / {formatSum(g.targetAmount)}</p>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/10 overflow-hidden mb-2">
                    <div className={`h-full rounded-full bg-gradient-to-r ${isDone ? "from-emerald-400 to-teal-400" : "from-violet-500 to-fuchsia-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                  {!isDone && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/40 mr-auto">{t("chores.topUpFromWallet")}</span>
                      {[10000, 25000, 50000].map((amt) => (
                        <button key={amt} onClick={() => gift.mutate({ goalId: g.id, amount: amt })}
                          disabled={gift.isPending || (wallet?.availableUzs ?? 0) < amt}
                          className="rounded-full border border-white/15 text-white/70 text-xs px-3 py-1 font-medium hover:bg-white/[0.06] disabled:opacity-40">
                          +{new Intl.NumberFormat("ru-UZ").format(amt)}
                        </button>
                      ))}
                    </div>
                  )}
                </Panel>
              );
            })}
          </div>
        </MotionItem>
      )}
    </MotionStagger>
  );
}
