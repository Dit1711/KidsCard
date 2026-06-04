"use client";

import { useState } from "react";
import { formatSum } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  cardService, paymentService, disputeService, familyService, openBankingService,
  type CardResponse, type DisputeReason, type DisputeResponse,
} from "@/lib/api";
import { Panel, DInput, DButton, DBadge, DSelect, Pill } from "@/components/dark";
import { CardSurface } from "@/components/CardSurface";
import { CARD_THEMES, CARD_PATTERNS, themeLabel, patternLabel } from "@/lib/cardThemes";
import { useT } from "@/i18n/locale";
import { toast } from "sonner";
import {
  Snowflake, Palette, Ban, ShieldCheck, Trash2, ChevronDown,
  ArrowDownLeft, ArrowUpRight, Wallet, Settings2, X, ShieldAlert,
  ArrowLeftRight, CreditCard, Landmark,
} from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

const typeLabelKey: Record<string, string> = {
  TOPUP: "cdm.typeTopup", PURCHASE: "cdm.typePurchase", REFUND: "cdm.typeRefund",
  TRANSFER: "cdm.typeTransfer", ALLOWANCE: "cdm.typeAllowance",
};

const DISPUTE_REASONS: { value: DisputeReason; labelKey: string }[] = [
  { value: "UNRECOGNIZED", labelKey: "cdm.reasonUnrecognized" },
  { value: "WRONG_AMOUNT", labelKey: "cdm.reasonWrongAmount" },
  { value: "NOT_RECEIVED", labelKey: "cdm.reasonNotReceived" },
  { value: "DUPLICATE", labelKey: "cdm.reasonDuplicate" },
  { value: "OTHER", labelKey: "cdm.reasonOther" },
];

const DISPUTE_STATUS: Record<string, { labelKey: string; tone: "warn" | "success" | "danger" | "muted" }> = {
  OPEN: { labelKey: "cdm.statusOpen", tone: "warn" },
  UNDER_REVIEW: { labelKey: "cdm.statusReview", tone: "warn" },
  RESOLVED: { labelKey: "cdm.statusResolved", tone: "success" },
  REJECTED: { labelKey: "cdm.statusRejected", tone: "muted" },
};

/** Modal with a card's balance, top-up, operations and settings. */
export function CardDetailModal({ card, childName, familyId, onClose }: {
  card: CardResponse;
  childName: string;
  familyId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const t = useT();
  const reasonLabel = (r: string) => {
    const k = DISPUTE_REASONS.find((x) => x.value === r)?.labelKey;
    return k ? t(k) : r;
  };
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
      toast.success(t("cdm.toastDisputeOpen"));
    },
    onError: (err: unknown) => {
      const code = (err as { response?: { data?: { error?: { code?: string } } } }).response?.data?.error?.code;
      toast.error(code === "DISPUTE_ALREADY_OPEN" ? t("cdm.toastDisputeExists") : t("cdm.toastDisputeError"));
    },
  });
  const withdrawDispute = useMutation({
    mutationFn: (disputeId: string) => disputeService.withdraw(disputeId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["disputes", familyId] }); toast(t("cdm.toastDisputeWithdrawn")); },
    onError: () => toast.error(t("cdm.toastDisputeWithdrawError")),
  });

  // Transfer (card→card / card→account)
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferMode, setTransferMode] = useState<"card" | "account">("card");
  const [transferTarget, setTransferTarget] = useState("");
  const [transferAmount, setTransferAmount] = useState("");

  const { data: familyCards } = useQuery({
    queryKey: ["family-cards", familyId],
    queryFn: async () => (await cardService.getByFamily(familyId)).data.data,
  });
  const { data: children } = useQuery({
    queryKey: ["family-children", familyId],
    queryFn: async () => (await familyService.getChildren(familyId)).data.data,
  });
  const { data: accounts } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => (await openBankingService.accounts()).data.data,
  });
  const otherCards = (familyCards ?? []).filter((c) => c.id !== cardId && c.status === "ACTIVE");

  const transferCard = useMutation({
    mutationFn: () => {
      const dest = familyCards?.find((c) => c.id === transferTarget);
      return paymentService.transfer({
        fromCardId: cardId, toCardId: transferTarget,
        fromChildId: card.childId, toChildId: dest!.childId,
        familyId, amountUzs: Math.round(parseFloat(transferAmount)),
        idempotencyKey: `transfer-${cardId}-${transferTarget}-${transferAmount}`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["balance", cardId] });
      qc.invalidateQueries({ queryKey: ["balance", transferTarget] });
      qc.invalidateQueries({ queryKey: ["transactions", cardId] });
      qc.invalidateQueries({ queryKey: ["transactions", transferTarget] });
      setTransferAmount(""); setTransferTarget(""); setShowTransfer(false);
      toast.success(t("cdm.toastTransferOk"));
    },
    onError: (err: unknown) => {
      const code = (err as { response?: { data?: { error?: { code?: string } } } }).response?.data?.error?.code;
      toast.error(code === "INSUFFICIENT_FUNDS" ? t("cdm.toastInsufficient") : t("cdm.toastTransferError"));
    },
  });

  const payout = useMutation({
    mutationFn: () =>
      paymentService.payout({
        cardId, childId: card.childId, familyId, accountId: transferTarget,
        amountUzs: Math.round(parseFloat(transferAmount)),
        idempotencyKey: `payout-${cardId}-${transferTarget}-${transferAmount}`,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["balance", cardId] });
      qc.invalidateQueries({ queryKey: ["transactions", cardId] });
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      setTransferAmount(""); setTransferTarget(""); setShowTransfer(false);
      toast.success(t("cdm.toastPayoutOk"));
    },
    onError: (err: unknown) => {
      const code = (err as { response?: { data?: { error?: { code?: string } } } }).response?.data?.error?.code;
      toast.error(code === "INSUFFICIENT_FUNDS" ? t("cdm.toastInsufficient") : t("cdm.toastPayoutError"));
    },
  });

  const childName2 = (cid: string) => children?.find((c) => c.id === cid)?.fullName ?? "";
  const targetValid = !!transferTarget && !!transferAmount && parseFloat(transferAmount) >= 100;

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
      toast.success(t("cdm.toastTopupOk"));
    },
    onError: () => toast.error(t("cdm.toastTopupError")),
  });

  const freeze = useMutation({
    mutationFn: () => (isFrozen ? cardService.unfreeze : cardService.freeze)(familyId, cardId),
    onSuccess: () => { refreshCards(); toast(isFrozen ? t("cdm.toastUnfrozen") : t("cdm.toastFrozen")); },
  });
  const block = useMutation({
    mutationFn: () => cardService.block(familyId, cardId),
    onSuccess: () => { refreshCards(); toast(t("cdm.toastBlocked")); },
    onError: () => toast.error(t("cdm.toastBlockError")),
  });
  const unblock = useMutation({
    mutationFn: () => cardService.unblock(familyId, cardId),
    onSuccess: () => { refreshCards(); toast.success(t("cdm.toastUnblocked")); },
    onError: () => toast.error(t("cdm.toastUnblockError")),
  });
  const close = useMutation({
    mutationFn: () => cardService.close(familyId, cardId),
    onSuccess: () => { refreshCards(); toast(t("cdm.toastDeleted")); onClose(); },
    onError: () => toast.error(t("cdm.toastDeleteError")),
  });
  const setDesign = useMutation({
    mutationFn: (p: { theme: string; pattern: string }) => cardService.setDesign(familyId, cardId, p.theme, p.pattern),
    onSuccess: refreshCards,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg my-auto rounded-3xl bg-[#15151f] border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07] sticky top-0 bg-[#15151f] rounded-t-3xl">
          <p className="font-semibold tracking-tight">{t("cdm.title", { name: childName })}</p>
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
                <p className="font-medium tracking-tight flex items-center gap-2"><Wallet className="h-4 w-4 text-fuchsia-300" /> {t("cdm.typeTopup")}</p>
                <button onClick={() => setShowTopUp(!showTopUp)} className="text-sm text-fuchsia-300 font-medium">
                  {showTopUp ? t("cdm.hide") : t("common.topUp")}
                </button>
              </div>
              {showTopUp && (
                <div className="space-y-3">
                  <div>
                    <DInput type="number" placeholder={t("banks.amount")} min="100" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} />
                    <div className="flex gap-2 flex-wrap mt-2">
                      {[10000, 25000, 50000, 100000].map((amt) => (
                        <button key={amt} onClick={() => setTopUpAmount(String(amt))}
                          className="px-2.5 py-1 text-xs rounded-lg bg-white/[0.05] text-white/60 hover:text-white transition-colors">
                          {formatSum(amt)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <DInput placeholder={t("cdm.comment")} value={topUpDesc} onChange={(e) => setTopUpDesc(e.target.value)} />
                  <DButton onClick={() => topUp.mutate()} disabled={!topUpAmount || parseFloat(topUpAmount) < 100 || topUp.isPending} className="w-full">
                    {topUp.isPending ? t("cdm.processing") : t("cdm.topUpFor", { sum: topUpAmount ? formatSum(parseFloat(topUpAmount)) : "…" })}
                  </DButton>
                </div>
              )}
            </Panel>
          )}

          {/* Transfer */}
          {!isBlocked && (
            <Panel className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium tracking-tight flex items-center gap-2"><ArrowLeftRight className="h-4 w-4 text-fuchsia-300" /> {t("cdm.typeTransfer")}</p>
                <button onClick={() => setShowTransfer(!showTransfer)} className="text-sm text-fuchsia-300 font-medium">
                  {showTransfer ? t("cdm.hide") : t("cdm.transferBtn")}
                </button>
              </div>
              {showTransfer && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Pill active={transferMode === "card"} onClick={() => { setTransferMode("card"); setTransferTarget(""); }}>
                      <span className="inline-flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> {t("cdm.toCard")}</span>
                    </Pill>
                    <Pill active={transferMode === "account"} onClick={() => { setTransferMode("account"); setTransferTarget(""); }}>
                      <span className="inline-flex items-center gap-1.5"><Landmark className="h-3.5 w-3.5" /> {t("cdm.toAccount")}</span>
                    </Pill>
                  </div>

                  {transferMode === "card" ? (
                    otherCards.length === 0 ? (
                      <p className="text-xs text-white/40">{t("cdm.noOtherCards")}</p>
                    ) : (
                      <DSelect value={transferTarget} onChange={(e) => setTransferTarget(e.target.value)}>
                        <option value="">{t("cdm.targetCard")}</option>
                        {otherCards.map((c) => (
                          <option key={c.id} value={c.id}>
                            {childName2(c.childId)} · {c.maskedPan}
                          </option>
                        ))}
                      </DSelect>
                    )
                  ) : (
                    (accounts ?? []).length === 0 ? (
                      <p className="text-xs text-white/40">{t("cdm.noAccounts")}</p>
                    ) : (
                      <DSelect value={transferTarget} onChange={(e) => setTransferTarget(e.target.value)}>
                        <option value="">{t("cdm.bankAccount")}</option>
                        {accounts!.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.bankCode} · {a.maskedNumber ?? t("banks.account")}
                          </option>
                        ))}
                      </DSelect>
                    )
                  )}

                  <DInput type="number" placeholder={t("banks.amount")} min="100" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} />
                  <DButton
                    className="w-full"
                    disabled={!targetValid || transferCard.isPending || payout.isPending}
                    onClick={() => (transferMode === "card" ? transferCard : payout).mutate()}
                  >
                    {transferCard.isPending || payout.isPending
                      ? t("banks.transferring")
                      : t("banks.transfer", { sum: transferAmount ? formatSum(parseFloat(transferAmount)) : "…" })}
                  </DButton>
                </div>
              )}
            </Panel>
          )}

          {/* Operations */}
          <Panel className="p-4">
            <p className="font-medium tracking-tight mb-3">{t("cdm.operations")}</p>
            {!txPage && <p className="text-white/50 text-sm">{t("common.loading")}</p>}
            {txPage?.content.length === 0 && <p className="text-white/40 text-sm">{t("cdm.noOps")}</p>}
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
                          <p className="text-sm font-medium">{tx.merchantName ?? (typeLabelKey[tx.type] ? t(typeLabelKey[tx.type]) : tx.type)}</p>
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
                            <DBadge tone={st.tone}>{t(st.labelKey)}</DBadge>
                            <span className="text-[11px] text-white/40 mr-auto">{reasonLabel(dispute.reason)}</span>
                            {isOpen && (
                              <button onClick={() => withdrawDispute.mutate(dispute.id)} disabled={withdrawDispute.isPending}
                                className="text-[11px] font-medium text-white/50 hover:text-white">{t("cdm.withdraw")}</button>
                            )}
                          </>
                        )}
                        {canDispute && !raising && (
                          <button onClick={() => setDisputeTxId(tx.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-300/90 hover:text-rose-300">
                            <ShieldAlert className="h-3.5 w-3.5" /> {t("cdm.dispute")}
                          </button>
                        )}
                      </div>
                    )}

                    {raising && (
                      <div className="mt-2 rounded-xl bg-white/[0.04] border border-white/10 p-3 space-y-2">
                        <p className="text-xs font-medium text-white/70">{t("cdm.disputeReason")}</p>
                        <div className="grid grid-cols-1 gap-1.5">
                          {DISPUTE_REASONS.map((r) => (
                            <button key={r.value} onClick={() => setDisputeReason(r.value)}
                              className={`text-left rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                                disputeReason === r.value ? "border-fuchsia-400/50 bg-fuchsia-500/15 text-fuchsia-100" : "border-white/10 text-white/70 hover:bg-white/[0.05]"
                              }`}>
                              {t(r.labelKey)}
                            </button>
                          ))}
                        </div>
                        <DInput placeholder={t("cdm.comment")} value={disputeDesc} onChange={(e) => setDisputeDesc(e.target.value)} />
                        <div className="flex gap-2">
                          <DButton variant="ghost" className="flex-1 py-1.5" onClick={() => { setDisputeTxId(null); setDisputeDesc(""); }}>{t("common.cancel")}</DButton>
                          <DButton className="flex-1 py-1.5" onClick={() => raiseDispute.mutate()} disabled={raiseDispute.isPending}>
                            {raiseDispute.isPending ? t("cdm.sending") : t("cdm.openDispute")}
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
              <span className="font-medium tracking-tight flex items-center gap-2"><Settings2 className="h-4 w-4 text-fuchsia-300" /> {t("cdm.cardSettings")}</span>
              <ChevronDown className={`h-4 w-4 text-white/50 transition-transform ${settingsOpen ? "rotate-180" : ""}`} />
            </button>

            {settingsOpen && (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {!isBlocked && (
                    <>
                      <DButton variant="outline" className="py-2" onClick={() => freeze.mutate()} disabled={freeze.isPending}>
                        <Snowflake className="h-4 w-4" /> {isFrozen ? t("cdm.unfreeze") : t("cdm.freeze")}
                      </DButton>
                      <DButton variant="outline" className="py-2" onClick={() => block.mutate()} disabled={block.isPending}>
                        <Ban className="h-4 w-4" /> {t("cdm.block")}
                      </DButton>
                      <DButton variant="outline" className="py-2" onClick={() => setDesignOpen(!designOpen)}>
                        <Palette className="h-4 w-4" /> {t("cdm.design")}
                      </DButton>
                    </>
                  )}
                  {isBlocked && (
                    <DButton variant="outline" className="py-2" onClick={() => unblock.mutate()} disabled={unblock.isPending}>
                      <ShieldCheck className="h-4 w-4" /> {t("cdm.unblock")}
                    </DButton>
                  )}
                  {confirmClose ? (
                    <>
                      <DButton variant="outline" className="py-2 border-rose-400/40 text-rose-300"
                        onClick={() => { close.mutate(); setConfirmClose(false); }} disabled={close.isPending}>
                        <Trash2 className="h-4 w-4" /> {t("cdm.confirmDelete")}
                      </DButton>
                      <DButton variant="ghost" className="py-2" onClick={() => setConfirmClose(false)}>{t("common.cancel")}</DButton>
                    </>
                  ) : (
                    <DButton variant="ghost" className="py-2 text-rose-300/80 hover:text-rose-300" onClick={() => setConfirmClose(true)}>
                      <Trash2 className="h-4 w-4" /> {t("cdm.delete")}
                    </DButton>
                  )}
                </div>

                {designOpen && !isBlocked && (
                  <div className="space-y-3 pt-1">
                    <p className="text-sm font-medium">{t("kidh.cardColor")}</p>
                    <div className="grid grid-cols-8 gap-2">
                      {CARD_THEMES.map((th) => (
                        <button key={th.key}
                          onClick={() => setDesign.mutate({ theme: th.key, pattern: card.pattern })}
                          className={`h-9 rounded-lg bg-gradient-to-br ${th.grad} ${card.theme === th.key ? "ring-2 ring-offset-2 ring-offset-[#15151f] ring-white" : ""}`}
                          title={themeLabel(th.key)} />
                      ))}
                    </div>
                    <p className="text-sm font-medium pt-1">{t("kidh.pattern")}</p>
                    <div className="flex gap-2 flex-wrap">
                      {CARD_PATTERNS.map((p) => (
                        <Pill key={p.key} active={card.pattern === p.key}
                          onClick={() => setDesign.mutate({ theme: card.theme, pattern: p.key })}>
                          {patternLabel(p.key)}
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
