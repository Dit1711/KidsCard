"use client";

import { useState } from "react";
import { formatSum } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  cardService, paymentService, disputeService,
  type CardResponse, type DisputeReason, type DisputeResponse,
} from "@/lib/api";
import { Panel, DInput, DButton, DBadge, Pill } from "@/components/dark";
import { CardSurface } from "@/components/CardSurface";
import { CARD_THEMES, CARD_PATTERNS } from "@/lib/cardThemes";
import { toast } from "sonner";
import {
  Snowflake, Palette, Ban, ShieldCheck, Trash2, ChevronDown,
  ArrowDownLeft, ArrowUpRight, Wallet, Settings2, X, ShieldAlert,
} from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

const typeLabel: Record<string, string> = {
  TOPUP: "Пополнение", PURCHASE: "Покупка", REFUND: "Возврат",
  TRANSFER: "Перевод", ALLOWANCE: "Карманные деньги",
};

const DISPUTE_REASONS: { value: DisputeReason; label: string }[] = [
  { value: "UNRECOGNIZED", label: "Не узнаю покупку" },
  { value: "WRONG_AMOUNT", label: "Неверная сумма" },
  { value: "NOT_RECEIVED", label: "Товар/услуга не получены" },
  { value: "DUPLICATE", label: "Двойное списание" },
  { value: "OTHER", label: "Другое" },
];
const reasonLabel = (r: string) => DISPUTE_REASONS.find((x) => x.value === r)?.label ?? r;

const DISPUTE_STATUS: Record<string, { label: string; tone: "warn" | "success" | "danger" | "muted" }> = {
  OPEN: { label: "Спор открыт", tone: "warn" },
  UNDER_REVIEW: { label: "На рассмотрении", tone: "warn" },
  RESOLVED: { label: "Возврат одобрен", tone: "success" },
  REJECTED: { label: "Спор отклонён", tone: "muted" },
};

/** Modal with a card's balance, top-up, operations and settings. */
export function CardDetailModal({ card, childName, familyId, onClose }: {
  card: CardResponse;
  childName: string;
  familyId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const cardId = card.id;
  const [showTopUp, setShowTopUp] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [designOpen, setDesignOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpDesc, setTopUpDesc] = useState("");

  const isFrozen = card.status === "FROZEN";
  const isBlocked = card.status === "BLOCKED";

  // Same query key & shape as useCardBalances (object), so they dedupe correctly.
  const { data: balanceData } = useQuery({
    queryKey: ["balance", cardId],
    queryFn: async () => (await paymentService.getBalance(cardId)).data.data,
    refetchInterval: 10_000,
  });
  const balance = balanceData?.balanceUzs;
  const { data: txPage } = useQuery({
    queryKey: ["transactions", cardId],
    queryFn: async () => (await paymentService.getCardTransactions(cardId, 0, 30)).data.data,
  });

  const { data: disputes } = useQuery({
    queryKey: ["disputes", familyId],
    queryFn: async () => (await disputeService.listByFamily(familyId)).data.data,
  });
  const disputeByTx = new Map<string, DisputeResponse>();
  disputes?.forEach((d) => { if (!disputeByTx.has(d.transactionId)) disputeByTx.set(d.transactionId, d); });

  const [disputeTxId, setDisputeTxId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState<DisputeReason>("UNRECOGNIZED");
  const [disputeDesc, setDisputeDesc] = useState("");

  const raiseDispute = useMutation({
    mutationFn: () => disputeService.raise({ transactionId: disputeTxId!, reason: disputeReason, description: disputeDesc || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disputes", familyId] });
      setDisputeTxId(null); setDisputeDesc(""); setDisputeReason("UNRECOGNIZED");
      toast.success("Спор открыт. Мы рассмотрим обращение.");
    },
    onError: (err: unknown) => {
      const code = (err as { response?: { data?: { error?: { code?: string } } } }).response?.data?.error?.code;
      toast.error(code === "DISPUTE_ALREADY_OPEN" ? "По этой операции уже открыт спор" : "Не удалось открыть спор");
    },
  });
  const withdrawDispute = useMutation({
    mutationFn: (disputeId: string) => disputeService.withdraw(disputeId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["disputes", familyId] }); toast("Спор отозван"); },
    onError: () => toast.error("Не удалось отозвать спор"),
  });

  const refreshCards = () => qc.invalidateQueries({ queryKey: ["family-cards", familyId] });

  const topUp = useMutation({
    mutationFn: () =>
      paymentService.topUp({
        cardId,
        childId: card.childId,
        familyId,
        amountUzs: Math.round(parseFloat(topUpAmount)),
        description: topUpDesc || "Пополнение",
        idempotencyKey: `topup-${cardId}-${Date.now()}`,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["balance", cardId] });
      qc.invalidateQueries({ queryKey: ["transactions", cardId] });
      setTopUpAmount(""); setTopUpDesc(""); setShowTopUp(false);
      toast.success("Карта пополнена");
    },
    onError: () => toast.error("Ошибка пополнения. Проверьте сумму."),
  });

  const freeze = useMutation({
    mutationFn: () => (isFrozen ? cardService.unfreeze : cardService.freeze)(familyId, cardId),
    onSuccess: () => { refreshCards(); toast(isFrozen ? "Карта разморожена" : "Карта заморожена"); },
  });
  const block = useMutation({
    mutationFn: () => cardService.block(familyId, cardId),
    onSuccess: () => { refreshCards(); toast("Карта заблокирована"); },
    onError: () => toast.error("Не удалось заблокировать карту"),
  });
  const unblock = useMutation({
    mutationFn: () => cardService.unblock(familyId, cardId),
    onSuccess: () => { refreshCards(); toast.success("Карта разблокирована"); },
    onError: () => toast.error("Не удалось разблокировать карту"),
  });
  const close = useMutation({
    mutationFn: () => cardService.close(familyId, cardId),
    onSuccess: () => { refreshCards(); toast("Карта удалена"); onClose(); },
    onError: () => toast.error("Не удалось удалить карту"),
  });
  const setDesign = useMutation({
    mutationFn: (p: { theme: string; pattern: string }) => cardService.setDesign(familyId, cardId, p.theme, p.pattern),
    onSuccess: refreshCards,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg my-auto rounded-3xl bg-[#15151f] border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07] sticky top-0 bg-[#15151f] rounded-t-3xl">
          <p className="font-semibold tracking-tight">Карта · {childName}</p>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.05] border border-white/10 text-white/50 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Card visual */}
          <div className={isBlocked ? "opacity-60" : ""}>
            <CardSurface theme={card.theme} pattern={card.pattern} className="rounded-2xl text-white p-5">
              <div className="flex justify-between items-start mb-7">
                <p className="text-xs text-white/60">{card.cardType} · {card.network}</p>
                <span className={`text-[11px] rounded-full px-2.5 py-0.5 bg-white/15 ${
                  isFrozen ? "text-amber-100" : isBlocked ? "text-red-100" : "text-emerald-100"
                }`}>{card.status}</span>
              </div>
              <p className="font-mono tracking-[0.2em] mb-4">{card.maskedPan}</p>
              <div className="flex justify-between items-end">
                <span className="text-white/60 text-sm tabular-nums">
                  {String(card.expiryMonth).padStart(2, "0")}/{card.expiryYear}
                </span>
                <span className="text-2xl font-bold tabular-nums">{formatSum(balance ?? 0)}</span>
              </div>
            </CardSurface>
          </div>

          {/* Top up */}
          {!isBlocked && (
            <Panel className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium tracking-tight flex items-center gap-2"><Wallet className="h-4 w-4 text-fuchsia-300" /> Пополнение</p>
                <button onClick={() => setShowTopUp(!showTopUp)} className="text-sm text-fuchsia-300 font-medium">
                  {showTopUp ? "Скрыть" : "Пополнить"}
                </button>
              </div>
              {showTopUp && (
                <div className="space-y-3">
                  <div>
                    <DInput type="number" placeholder="Сумма (сум)" min="100" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} />
                    <div className="flex gap-2 flex-wrap mt-2">
                      {[10000, 25000, 50000, 100000].map((amt) => (
                        <button key={amt} onClick={() => setTopUpAmount(String(amt))}
                          className="px-2.5 py-1 text-xs rounded-lg bg-white/[0.05] text-white/60 hover:text-white transition-colors">
                          {formatSum(amt)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <DInput placeholder="Комментарий (необязательно)" value={topUpDesc} onChange={(e) => setTopUpDesc(e.target.value)} />
                  <DButton onClick={() => topUp.mutate()} disabled={!topUpAmount || parseFloat(topUpAmount) < 100 || topUp.isPending} className="w-full">
                    {topUp.isPending ? "Обработка…" : `Пополнить на ${topUpAmount ? formatSum(parseFloat(topUpAmount)) : "…"}`}
                  </DButton>
                </div>
              )}
            </Panel>
          )}

          {/* Operations */}
          <Panel className="p-4">
            <p className="font-medium tracking-tight mb-3">Операции</p>
            {!txPage && <p className="text-white/50 text-sm">Загрузка…</p>}
            {txPage?.content.length === 0 && <p className="text-white/40 text-sm">Операций по этой карте ещё нет.</p>}
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {txPage?.content.map((tx) => {
                const isCredit = tx.direction === "CREDIT";
                const dispute = disputeByTx.get(tx.id);
                const canDispute = !isCredit && (tx.type === "PURCHASE" || tx.type === "TRANSFER") && !dispute;
                const st = dispute ? DISPUTE_STATUS[dispute.status] : null;
                const isOpen = dispute?.status === "OPEN" || dispute?.status === "UNDER_REVIEW";
                const raising = disputeTxId === tx.id;
                return (
                  <div key={tx.id} className="py-2 border-b border-white/[0.05] last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`grid h-9 w-9 place-items-center rounded-full ${isCredit ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                          {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{tx.merchantName ?? typeLabel[tx.type] ?? tx.type}</p>
                          <p className="text-xs text-white/40">{formatDate(tx.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold text-sm tabular-nums ${isCredit ? "text-emerald-300" : "text-white"}`}>
                          {isCredit ? "+" : "−"}{formatSum(tx.amountUzs)}
                        </p>
                        <p className="text-xs text-white/40 tabular-nums">{formatSum(tx.balanceAfter)}</p>
                      </div>
                    </div>

                    {(canDispute || dispute) && (
                      <div className="flex items-center justify-end gap-2 mt-1.5">
                        {dispute && st && (
                          <>
                            <DBadge tone={st.tone}>{st.label}</DBadge>
                            <span className="text-[11px] text-white/40 mr-auto">{reasonLabel(dispute.reason)}</span>
                            {isOpen && (
                              <button onClick={() => withdrawDispute.mutate(dispute.id)} disabled={withdrawDispute.isPending}
                                className="text-[11px] font-medium text-white/50 hover:text-white">Отозвать</button>
                            )}
                          </>
                        )}
                        {canDispute && !raising && (
                          <button onClick={() => setDisputeTxId(tx.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-300/90 hover:text-rose-300">
                            <ShieldAlert className="h-3.5 w-3.5" /> Оспорить
                          </button>
                        )}
                      </div>
                    )}

                    {raising && (
                      <div className="mt-2 rounded-xl bg-white/[0.04] border border-white/10 p-3 space-y-2">
                        <p className="text-xs font-medium text-white/70">Причина спора</p>
                        <div className="grid grid-cols-1 gap-1.5">
                          {DISPUTE_REASONS.map((r) => (
                            <button key={r.value} onClick={() => setDisputeReason(r.value)}
                              className={`text-left rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                                disputeReason === r.value ? "border-fuchsia-400/50 bg-fuchsia-500/15 text-fuchsia-100" : "border-white/10 text-white/70 hover:bg-white/[0.05]"
                              }`}>
                              {r.label}
                            </button>
                          ))}
                        </div>
                        <DInput placeholder="Комментарий (необязательно)" value={disputeDesc} onChange={(e) => setDisputeDesc(e.target.value)} />
                        <div className="flex gap-2">
                          <DButton variant="ghost" className="flex-1 py-1.5" onClick={() => { setDisputeTxId(null); setDisputeDesc(""); }}>Отмена</DButton>
                          <DButton className="flex-1 py-1.5" onClick={() => raiseDispute.mutate()} disabled={raiseDispute.isPending}>
                            {raiseDispute.isPending ? "Отправка…" : "Открыть спор"}
                          </DButton>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Settings */}
          <Panel className="p-4">
            <button onClick={() => setSettingsOpen(!settingsOpen)} className="flex items-center justify-between w-full">
              <span className="font-medium tracking-tight flex items-center gap-2"><Settings2 className="h-4 w-4 text-fuchsia-300" /> Настройки карты</span>
              <ChevronDown className={`h-4 w-4 text-white/50 transition-transform ${settingsOpen ? "rotate-180" : ""}`} />
            </button>

            {settingsOpen && (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {!isBlocked && (
                    <>
                      <DButton variant="outline" className="py-2" onClick={() => freeze.mutate()} disabled={freeze.isPending}>
                        <Snowflake className="h-4 w-4" /> {isFrozen ? "Разморозить" : "Заморозить"}
                      </DButton>
                      <DButton variant="outline" className="py-2" onClick={() => block.mutate()} disabled={block.isPending}>
                        <Ban className="h-4 w-4" /> Заблокировать
                      </DButton>
                      <DButton variant="outline" className="py-2" onClick={() => setDesignOpen(!designOpen)}>
                        <Palette className="h-4 w-4" /> Оформление
                      </DButton>
                    </>
                  )}
                  {isBlocked && (
                    <DButton variant="outline" className="py-2" onClick={() => unblock.mutate()} disabled={unblock.isPending}>
                      <ShieldCheck className="h-4 w-4" /> Разблокировать
                    </DButton>
                  )}
                  {confirmClose ? (
                    <>
                      <DButton variant="outline" className="py-2 border-rose-400/40 text-rose-300"
                        onClick={() => { close.mutate(); setConfirmClose(false); }} disabled={close.isPending}>
                        <Trash2 className="h-4 w-4" /> Точно удалить?
                      </DButton>
                      <DButton variant="ghost" className="py-2" onClick={() => setConfirmClose(false)}>Отмена</DButton>
                    </>
                  ) : (
                    <DButton variant="ghost" className="py-2 text-rose-300/80 hover:text-rose-300" onClick={() => setConfirmClose(true)}>
                      <Trash2 className="h-4 w-4" /> Удалить
                    </DButton>
                  )}
                </div>

                {designOpen && !isBlocked && (
                  <div className="space-y-3 pt-1">
                    <p className="text-sm font-medium">Цвет карты</p>
                    <div className="grid grid-cols-8 gap-2">
                      {CARD_THEMES.map((t) => (
                        <button key={t.key}
                          onClick={() => setDesign.mutate({ theme: t.key, pattern: card.pattern })}
                          className={`h-9 rounded-lg bg-gradient-to-br ${t.grad} ${card.theme === t.key ? "ring-2 ring-offset-2 ring-offset-[#15151f] ring-white" : ""}`}
                          title={t.label} />
                      ))}
                    </div>
                    <p className="text-sm font-medium pt-1">Узор</p>
                    <div className="flex gap-2 flex-wrap">
                      {CARD_PATTERNS.map((p) => (
                        <Pill key={p.key} active={card.pattern === p.key}
                          onClick={() => setDesign.mutate({ theme: card.theme, pattern: p.key })}>
                          {p.label}
                        </Pill>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
