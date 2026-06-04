"use client";

import { useState } from "react";
import { formatSum } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { familyService, cardService } from "@/lib/api";
import { useCardBalances } from "@/hooks/useCardBalances";
import { useFamilyStore } from "@/store/family";
import { Panel, DLabel, DButton, Pill, DSelect } from "@/components/dark";
import { CardSurface } from "@/components/CardSurface";
import { CardDetailModal } from "@/components/CardDetailModal";
import { MotionStagger, MotionItem } from "@/components/motion";
import { toast } from "sonner";
import { Plus, CreditCard, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useT } from "@/i18n/locale";

const CARD_TYPES = ["VIRTUAL", "PHYSICAL"];
const NETWORKS = ["UZCARD", "HUMO", "VISA"];

export default function CardsPage() {
  const qc = useQueryClient();
  const { family } = useFamilyStore();
  const t = useT();

  const [showIssue, setShowIssue] = useState(false);
  const [selectedChild, setSelectedChild] = useState("");
  const [cardType, setCardType] = useState("VIRTUAL");
  const [network, setNetwork] = useState("UZCARD");
  const [openCardId, setOpenCardId] = useState<string | null>(null);

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
      toast.success(t("cards.toastIssued"));
    },
    onError: () => toast.error(t("cards.toastIssueError")),
  });

  if (!family) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t("nav.cards")}</h1>
        <Panel className="p-10 flex flex-col items-center gap-3">
          <p className="text-white/50">{t("cards.needFamily")}</p>
          <Link href="/family"><DButton>{t("cards.goToFamily")}</DButton></Link>
        </Panel>
      </div>
    );
  }

  return (
    <MotionStagger className="space-y-6">
      <MotionItem>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{t("nav.cards")}</h1>
          <DButton variant={showIssue ? "outline" : "primary"} onClick={() => setShowIssue(!showIssue)}>
            {showIssue ? t("common.cancel") : <><Plus className="h-4 w-4" /> {t("cards.issueCard")}</>}
          </DButton>
        </div>
      </MotionItem>

      {showIssue && (
        <MotionItem>
          <Panel className="p-5 space-y-4">
            <p className="font-medium tracking-tight">{t("cards.newCard")}</p>
            <div>
              <DLabel>{t("common.child")}</DLabel>
              <DSelect value={selectedChild} onChange={(e) => setSelectedChild(e.target.value)}>
                <option value="">{t("cards.selectChild")}</option>
                {children?.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
              </DSelect>
            </div>
            <div>
              <DLabel>{t("cards.cardType")}</DLabel>
              <div className="flex gap-2">
                {CARD_TYPES.map((ct) => (
                  <Pill key={ct} active={cardType === ct} onClick={() => setCardType(ct)}>
                    {ct === "VIRTUAL" ? t("cards.virtual") : t("cards.physical")}
                  </Pill>
                ))}
              </div>
            </div>
            <div>
              <DLabel>{t("cards.network")}</DLabel>
              <div className="flex gap-2">
                {NETWORKS.map((n) => (
                  <Pill key={n} active={network === n} onClick={() => setNetwork(n)}>{n}</Pill>
                ))}
              </div>
            </div>
            <DButton onClick={() => issueCard.mutate()} disabled={!selectedChild || issueCard.isPending} className="w-full">
              {issueCard.isPending ? t("cards.issuing") : t("cards.issueCard")}
            </DButton>
          </Panel>
        </MotionItem>
      )}

      {isLoading && <p className="text-white/50">{t("common.loading")}</p>}

      {cards?.length === 0 && !showIssue && (
        <MotionItem>
          <Panel className="p-10 flex flex-col items-center gap-3 border-dashed">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-white/50"><CreditCard className="h-6 w-6" /></span>
            <p className="text-white/50">{t("dashboard.noCards")}</p>
          </Panel>
        </MotionItem>
      )}

      <div className="space-y-4">
        {cards?.map((card) => {
          const child = children?.find((c) => c.id === card.childId);
          const isFrozen = card.status === "FROZEN";
          const isBlocked = card.status === "BLOCKED";

          return (
            <MotionItem key={card.id}>
              <button onClick={() => setOpenCardId(card.id)}
                className={`block w-full text-left transition-transform hover:scale-[1.01] ${isBlocked ? "opacity-60" : ""}`}>
                <CardSurface theme={card.theme} pattern={card.pattern} className="rounded-2xl text-white p-5">
                  <div className="flex justify-between items-start mb-7">
                    <div>
                      <p className="text-xs text-white/60">{card.cardType} · {card.network}</p>
                      <p className="font-semibold">{child?.fullName ?? t("common.child")}</p>
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
                      <span className="text-xl font-bold tabular-nums">{formatSum(balances[card.id] ?? 0)}</span>
                      <ChevronRight className="h-4 w-4 text-white/60" />
                    </div>
                  </div>
                </CardSurface>
              </button>
            </MotionItem>
          );
        })}
      </div>

      {openCardId && (() => {
        const c = cards?.find((x) => x.id === openCardId);
        if (!c) return null;
        const childName = children?.find((ch) => ch.id === c.childId)?.fullName ?? t("common.child");
        return <CardDetailModal card={c} childName={childName} familyId={family.id} onClose={() => setOpenCardId(null)} />;
      })()}
    </MotionStagger>
  );
}
