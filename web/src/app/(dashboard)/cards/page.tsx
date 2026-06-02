"use client";

import { useState } from "react";
import { formatSum } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { familyService, cardService } from "@/lib/api";
import { useCardBalances } from "@/hooks/useCardBalances";
import { useFamilyStore } from "@/store/family";
import { Panel, DLabel, DButton, Pill, DSelect } from "@/components/dark";
import { CardSurface } from "@/components/CardSurface";
import { CARD_THEMES, CARD_PATTERNS } from "@/lib/cardThemes";
import { MotionStagger, MotionItem } from "@/components/motion";
import { toast } from "sonner";
import { Plus, Snowflake, Palette, CreditCard, Ban, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";

const CARD_TYPES = ["VIRTUAL", "PHYSICAL"];
const NETWORKS = ["UZCARD", "HUMO", "VISA"];

export default function CardsPage() {
  const qc = useQueryClient();
  const { family } = useFamilyStore();

  const [showIssue, setShowIssue] = useState(false);
  const [selectedChild, setSelectedChild] = useState("");
  const [cardType, setCardType] = useState("VIRTUAL");
  const [network, setNetwork] = useState("UZCARD");
  const [designCard, setDesignCard] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState<string | null>(null);

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

  const freezeCard = useMutation({
    mutationFn: (cardId: string) => cardService.freeze(family!.id, cardId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["family-cards", family!.id] }); toast("Карта заморожена"); },
  });
  const unfreezeCard = useMutation({
    mutationFn: (cardId: string) => cardService.unfreeze(family!.id, cardId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["family-cards", family!.id] }); toast.success("Карта разморожена"); },
  });
  const blockCard = useMutation({
    mutationFn: (cardId: string) => cardService.block(family!.id, cardId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["family-cards", family!.id] }); toast("Карта заблокирована"); },
    onError: () => toast.error("Не удалось заблокировать карту"),
  });
  const unblockCard = useMutation({
    mutationFn: (cardId: string) => cardService.unblock(family!.id, cardId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["family-cards", family!.id] }); toast.success("Карта разблокирована"); },
    onError: () => toast.error("Не удалось разблокировать карту"),
  });
  const closeCard = useMutation({
    mutationFn: (cardId: string) => cardService.close(family!.id, cardId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["family-cards", family!.id] }); toast("Карта удалена"); },
    onError: () => toast.error("Не удалось удалить карту"),
  });
  const setDesign = useMutation({
    mutationFn: ({ cardId, theme, pattern }: { cardId: string; theme: string; pattern: string }) =>
      cardService.setDesign(family!.id, cardId, theme, pattern),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family-cards", family!.id] }),
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
        {cards?.map((card) => {
          const child = children?.find((c) => c.id === card.childId);
          const isFrozen = card.status === "FROZEN";
          const isBlocked = card.status === "BLOCKED";
          const designOpen = designCard === card.id;

          return (
            <MotionItem key={card.id}>
              <div className={isBlocked ? "opacity-60" : ""}>
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
                    <span className="text-xl font-bold tabular-nums">{formatSum(balances[card.id] ?? 0)}</span>
                  </div>
                </CardSurface>

                <div className="flex flex-wrap gap-2 mt-3">
                  {!isBlocked && (
                    <>
                      <DButton variant="outline" className="py-2"
                        onClick={() => (isFrozen ? unfreezeCard : freezeCard).mutate(card.id)}
                        disabled={freezeCard.isPending || unfreezeCard.isPending}>
                        <Snowflake className="h-4 w-4" /> {isFrozen ? "Разморозить" : "Заморозить"}
                      </DButton>
                      <DButton variant="outline" className="py-2"
                        onClick={() => blockCard.mutate(card.id)} disabled={blockCard.isPending}>
                        <Ban className="h-4 w-4" /> Заблокировать
                      </DButton>
                      <DButton variant="outline" className="py-2"
                        onClick={() => setDesignCard(designOpen ? null : card.id)}>
                        <Palette className="h-4 w-4" /> Оформление
                      </DButton>
                    </>
                  )}
                  {isBlocked && (
                    <DButton variant="outline" className="py-2"
                      onClick={() => unblockCard.mutate(card.id)} disabled={unblockCard.isPending}>
                      <ShieldCheck className="h-4 w-4" /> Разблокировать
                    </DButton>
                  )}
                  {confirmClose === card.id ? (
                    <>
                      <DButton variant="outline" className="py-2 border-rose-400/40 text-rose-300"
                        onClick={() => { closeCard.mutate(card.id); setConfirmClose(null); }}
                        disabled={closeCard.isPending}>
                        <Trash2 className="h-4 w-4" /> Точно удалить?
                      </DButton>
                      <DButton variant="ghost" className="py-2" onClick={() => setConfirmClose(null)}>
                        Отмена
                      </DButton>
                    </>
                  ) : (
                    <DButton variant="ghost" className="py-2 text-rose-300/80 hover:text-rose-300"
                      onClick={() => setConfirmClose(card.id)}>
                      <Trash2 className="h-4 w-4" /> Удалить
                    </DButton>
                  )}
                </div>

                {designOpen && (
                  <Panel className="p-4 mt-3 space-y-3">
                    <p className="text-sm font-medium">Цвет карты</p>
                    <div className="grid grid-cols-8 gap-2">
                      {CARD_THEMES.map((t) => (
                        <button key={t.key}
                          onClick={() => setDesign.mutate({ cardId: card.id, theme: t.key, pattern: card.pattern })}
                          className={`h-9 rounded-lg bg-gradient-to-br ${t.grad} ${card.theme === t.key ? "ring-2 ring-offset-2 ring-offset-[#0f0f17] ring-white" : ""}`}
                          title={t.label} />
                      ))}
                    </div>
                    <p className="text-sm font-medium pt-1">Узор</p>
                    <div className="flex gap-2 flex-wrap">
                      {CARD_PATTERNS.map((p) => (
                        <Pill key={p.key} active={card.pattern === p.key}
                          onClick={() => setDesign.mutate({ cardId: card.id, theme: card.theme, pattern: p.key })}>
                          {p.label}
                        </Pill>
                      ))}
                    </div>
                  </Panel>
                )}
              </div>
            </MotionItem>
          );
        })}
      </div>
    </MotionStagger>
  );
}
