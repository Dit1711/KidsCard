"use client";

import { useState } from "react";
import { formatSum } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { familyService, cardService, paymentService, type CardResponse, type ChildResponse } from "@/lib/api";
import { useCardBalances } from "@/hooks/useCardBalances";
import { useFamilyStore } from "@/store/family";
import { Panel, DLabel, DInput, DButton, Pill, DSelect } from "@/components/dark";
import { CardSurface } from "@/components/CardSurface";
import { CARD_THEMES, CARD_PATTERNS } from "@/lib/cardThemes";
import { MotionStagger, MotionItem } from "@/components/motion";
import { toast } from "sonner";
import {
  Plus, Snowflake, Palette, CreditCard, Ban, ShieldCheck, Trash2,
  ChevronDown, ArrowDownLeft, ArrowUpRight, Wallet, Settings2,
} from "lucide-react";
import Link from "next/link";

const CARD_TYPES = ["VIRTUAL", "PHYSICAL"];
const NETWORKS = ["UZCARD", "HUMO", "VISA"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

const typeLabel: Record<string, string> = {
  TOPUP: "Пополнение", PURCHASE: "Покупка", REFUND: "Возврат",
  TRANSFER: "Перевод", ALLOWANCE: "Карманные деньги",
};

/** One card: tap to expand → top-up, this card's operations, and settings. */
function CardItem({ card, child, familyId, balance }: {
  card: CardResponse;
  child?: ChildResponse;
  familyId: string;
  balance: number;
}) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [designOpen, setDesignOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpDesc, setTopUpDesc] = useState("");

  const isFrozen = card.status === "FROZEN";
  const isBlocked = card.status === "BLOCKED";

  const { data: txPage } = useQuery({
    queryKey: ["transactions", card.id],
    queryFn: async () => (await paymentService.getCardTransactions(card.id, 0, 20)).data.data,
    enabled: expanded,
  });

  const refreshCards = () => qc.invalidateQueries({ queryKey: ["family-cards", familyId] });

  const topUp = useMutation({
    mutationFn: () =>
      paymentService.topUp({
        cardId: card.id,
        childId: card.childId,
        familyId,
        amountUzs: Math.round(parseFloat(topUpAmount)),
        description: topUpDesc || "Пополнение",
        idempotencyKey: `topup-${card.id}-${Date.now()}`,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["balance", card.id] });
      qc.invalidateQueries({ queryKey: ["transactions", card.id] });
      setTopUpAmount(""); setTopUpDesc(""); setShowTopUp(false);
      toast.success("Карта пополнена");
    },
    onError: () => toast.error("Ошибка пополнения. Проверьте сумму."),
  });

  const freeze = useMutation({
    mutationFn: () => (isFrozen ? cardService.unfreeze : cardService.freeze)(familyId, card.id),
    onSuccess: () => { refreshCards(); toast(isFrozen ? "Карта разморожена" : "Карта заморожена"); },
  });
  const block = useMutation({
    mutationFn: () => cardService.block(familyId, card.id),
    onSuccess: () => { refreshCards(); toast("Карта заблокирована"); },
    onError: () => toast.error("Не удалось заблокировать карту"),
  });
  const unblock = useMutation({
    mutationFn: () => cardService.unblock(familyId, card.id),
    onSuccess: () => { refreshCards(); toast.success("Карта разблокирована"); },
    onError: () => toast.error("Не удалось разблокировать карту"),
  });
  const close = useMutation({
    mutationFn: () => cardService.close(familyId, card.id),
    onSuccess: () => { refreshCards(); toast("Карта удалена"); },
    onError: () => toast.error("Не удалось удалить карту"),
  });
  const setDesign = useMutation({
    mutationFn: (p: { theme: string; pattern: string }) => cardService.setDesign(familyId, card.id, p.theme, p.pattern),
    onSuccess: refreshCards,
  });

  return (
    <div className={isBlocked ? "opacity-60" : ""}>
      <button onClick={() => setExpanded(!expanded)} className="block w-full text-left">
        <CardSurface theme={card.theme} pattern={card.pattern} className="rounded-2xl text-white p-5">
          <div className="flex justify-between items-start mb-7">
            <div>
              <p className="text-xs text-white/60">{card.cardType} · {card.network}</p>
              <p className="font-semibold">{child?.fullName ?? "Ребёнок"}</p>
            </div>
            <span className={`text-[11px] rounded-full px-2.5 py-0.5 bg-white/15 ${
              isFrozen ? "text-amber-100" : isBlocked ? "text-red-100" : "text-emerald-100"
            }`}>
              {card.status}
            </span>
          </div>
          <p className="font-mono tracking-[0.2em] mb-4">{card.maskedPan}</p>
          <div className="flex justify-between items-end">
            <span className="text-white/60 text-sm tabular-nums">
              {String(card.expiryMonth).padStart(2, "0")}/{card.expiryYear}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tabular-nums">{formatSum(balance)}</span>
              <ChevronDown className={`h-4 w-4 text-white/60 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </div>
          </div>
        </CardSurface>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
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
            <div className="space-y-2">
              {txPage?.content.map((tx) => {
                const isCredit = tx.direction === "CREDIT";
                return (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-0">
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
                );
              })}
            </div>
            {txPage && txPage.totalElements > txPage.content.length && (
              <p className="text-xs text-center text-white/40 mt-3">Показано {txPage.content.length} из {txPage.totalElements}</p>
            )}
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
                          className={`h-9 rounded-lg bg-gradient-to-br ${t.grad} ${card.theme === t.key ? "ring-2 ring-offset-2 ring-offset-[#0f0f17] ring-white" : ""}`}
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
      )}
    </div>
  );
}

export default function CardsPage() {
  const qc = useQueryClient();
  const { family } = useFamilyStore();

  const [showIssue, setShowIssue] = useState(false);
  const [selectedChild, setSelectedChild] = useState("");
  const [cardType, setCardType] = useState("VIRTUAL");
  const [network, setNetwork] = useState("UZCARD");

  const { data: children } = useQuery({
    queryKey: ["family-children", family?.id],
    queryFn: async () => (await familyService.getChildren(family!.id)).data.data,
    enabled: !!family?.id,
  });

  const { data: cards, isLoading } = useQuery({
    queryKey: ["family-cards", family?.id],
    queryFn: async () => (await cardService.getByFamily(family!.id)).data.data,
    enabled: !!family?.id,
  });

  const { byCard: balances } = useCardBalances(cards?.map((c) => c.id) ?? []);

  const issueCard = useMutation({
    mutationFn: () => cardService.issue(family!.id, selectedChild, cardType, network),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-cards", family!.id] });
      setShowIssue(false);
      setSelectedChild("");
      toast.success("Карта выдана");
    },
    onError: () => toast.error("Ошибка выдачи карты"),
  });

  if (!family) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Карты</h1>
        <Panel className="p-10 flex flex-col items-center gap-3">
          <p className="text-white/50">Сначала создайте семью</p>
          <Link href="/family"><DButton>Перейти к семье</DButton></Link>
        </Panel>
      </div>
    );
  }

  return (
    <MotionStagger className="space-y-6">
      <MotionItem>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Карты</h1>
          <DButton variant={showIssue ? "outline" : "primary"} onClick={() => setShowIssue(!showIssue)}>
            {showIssue ? "Отмена" : <><Plus className="h-4 w-4" /> Выдать карту</>}
          </DButton>
        </div>
      </MotionItem>

      {showIssue && (
        <MotionItem>
          <Panel className="p-5 space-y-4">
            <p className="font-medium tracking-tight">Новая карта</p>
            <div>
              <DLabel>Ребёнок</DLabel>
              <DSelect value={selectedChild} onChange={(e) => setSelectedChild(e.target.value)}>
                <option value="">Выберите ребёнка</option>
                {children?.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
              </DSelect>
            </div>
            <div>
              <DLabel>Тип карты</DLabel>
              <div className="flex gap-2">
                {CARD_TYPES.map((t) => (
                  <Pill key={t} active={cardType === t} onClick={() => setCardType(t)}>
                    {t === "VIRTUAL" ? "Виртуальная" : "Физическая"}
                  </Pill>
                ))}
              </div>
            </div>
            <div>
              <DLabel>Платёжная система</DLabel>
              <div className="flex gap-2">
                {NETWORKS.map((n) => (
                  <Pill key={n} active={network === n} onClick={() => setNetwork(n)}>{n}</Pill>
                ))}
              </div>
            </div>
            <DButton onClick={() => issueCard.mutate()} disabled={!selectedChild || issueCard.isPending} className="w-full">
              {issueCard.isPending ? "Выдача…" : "Выдать карту"}
            </DButton>
          </Panel>
        </MotionItem>
      )}

      {isLoading && <p className="text-white/50">Загрузка…</p>}

      {cards?.length === 0 && !showIssue && (
        <MotionItem>
          <Panel className="p-10 flex flex-col items-center gap-3 border-dashed">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-white/50"><CreditCard className="h-6 w-6" /></span>
            <p className="text-white/50">Карты ещё не выданы</p>
          </Panel>
        </MotionItem>
      )}

      <div className="space-y-4">
        {cards?.map((card) => (
          <MotionItem key={card.id}>
            <CardItem
              card={card}
              child={children?.find((c) => c.id === card.childId)}
              familyId={family.id}
              balance={balances[card.id] ?? 0}
            />
          </MotionItem>
        ))}
      </div>
    </MotionStagger>
  );
}
