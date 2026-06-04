"use client";

import { useState } from "react";
import { Landmark } from "lucide-react";
import { formatSum } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { openBankingService, familyService, cardService } from "@/lib/api";
import { useFamilyStore } from "@/store/family";
import { Panel, DInput, DLabel, DButton, DSelect } from "@/components/dark";
import { MotionStagger, MotionItem } from "@/components/motion";
import { toast } from "sonner";
import { useT } from "@/i18n/locale";

export default function BanksPage() {
  const qc = useQueryClient();
  const { family } = useFamilyStore();
  const t = useT();

  const [fundAccount, setFundAccount] = useState<string | null>(null);
  const [fundChild, setFundChild] = useState("");
  const [fundAmount, setFundAmount] = useState("");

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => (await openBankingService.accounts()).data.data,
  });

  const { data: banks } = useQuery({
    queryKey: ["banks"],
    queryFn: async () => (await openBankingService.banks()).data.data,
  });

  const { data: children } = useQuery({
    queryKey: ["family-children", family?.id],
    queryFn: async () => (await familyService.getChildren(family!.id)).data.data,
    enabled: !!family?.id,
  });

  const { data: cards } = useQuery({
    queryKey: ["family-cards", family?.id],
    queryFn: async () => (await cardService.getByFamily(family!.id)).data.data,
    enabled: !!family?.id,
  });

  const link = useMutation({
    mutationFn: (bankCode: string) => openBankingService.link(bankCode),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bank-accounts"] }); toast.success(t("banks.toastLinked")); },
  });

  const fund = useMutation({
    mutationFn: () => {
      const card = cards?.find((c) => c.childId === fundChild);
      return openBankingService.fundCard({
        accountId: fundAccount!, cardId: card!.id, childId: fundChild, familyId: family!.id,
        amountUzs: Math.round(parseFloat(fundAmount)), idempotencyKey: `ob-${fundAccount}-${Date.now()}`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      qc.invalidateQueries({ queryKey: ["balance"] });
      setFundAmount(""); setFundChild(""); setFundAccount(null);
      toast.success(t("banks.toastFunded"));
    },
    onError: () => toast.error(t("banks.toastFundError")),
  });

  const childrenWithCards = children?.filter((c) => cards?.some((card) => card.childId === c.id));

  return (
    <MotionStagger className="space-y-6">
      <MotionItem>
        <h1 className="text-2xl font-bold tracking-tight">{t("banks.title")}</h1>
        <p className="text-white/50 mt-1 text-sm">{t("banks.subtitle")}</p>
      </MotionItem>

      {isLoading && <p className="text-white/50">{t("common.loading")}</p>}

      {accounts && accounts.length === 0 && (
        <MotionItem>
          <Panel className="p-10 flex flex-col items-center gap-4 border-dashed">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-white/60"><Landmark className="h-7 w-7" /></span>
            <p className="text-white/50">{t("banks.noAccounts")}</p>
            <div className="flex gap-2 flex-wrap justify-center">
              {banks?.map((b) => (
                <DButton key={b.code} onClick={() => link.mutate(b.code)} disabled={link.isPending}>
                  {link.isPending ? t("banks.linking") : t("banks.linkBank", { bank: b.name })}
                </DButton>
              ))}
            </div>
            <p className="text-xs text-white/40">{t("banks.demoHint")}</p>
          </Panel>
        </MotionItem>
      )}

      {accounts && accounts.length > 0 && (
        <div className="space-y-4">
          {accounts.map((acc) => (
            <MotionItem key={acc.id}>
              <Panel className="p-5">
                <div className="rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white p-5 mb-4">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-xs text-white/50">{acc.bankCode} · {acc.accountType}</p>
                      <p className="font-semibold">{acc.holderName ?? t("banks.account")}</p>
                    </div>
                    <span className="text-[11px] rounded-full px-2.5 py-0.5 bg-white/15 text-emerald-200">{acc.status}</span>
                  </div>
                  <p className="font-mono tracking-[0.2em] mb-3">{acc.maskedNumber}</p>
                  <div className="flex justify-between items-end">
                    <span className="text-white/50 text-sm">{t("banks.available")}</span>
                    <span className="font-bold text-xl tabular-nums">{formatSum(acc.balanceUzs)}</span>
                  </div>
                </div>

                <DButton variant={fundAccount === acc.id ? "outline" : "primary"}
                  onClick={() => setFundAccount(fundAccount === acc.id ? null : acc.id)} className="w-full">
                  {fundAccount === acc.id ? t("common.cancel") : t("banks.fundCard")}
                </DButton>

                {fundAccount === acc.id && (
                  <div className="mt-4 space-y-3">
                    <div className="h-px bg-white/[0.06]" />
                    <div>
                      <DLabel>{t("banks.childCard")}</DLabel>
                      <DSelect value={fundChild} onChange={(e) => setFundChild(e.target.value)}>
                        <option value="">{t("cards.selectChild")}</option>
                        {childrenWithCards?.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                      </DSelect>
                      {childrenWithCards?.length === 0 && (
                        <p className="text-xs text-amber-300 mt-1">{t("banks.noCardsHint")}</p>
                      )}
                    </div>
                    <div>
                      <DLabel>{t("banks.amount")}</DLabel>
                      <DInput type="number" placeholder="100000" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} />
                      <div className="flex gap-2 flex-wrap mt-2">
                        {[50000, 100000, 200000, 500000].map((amt) => (
                          <button key={amt} onClick={() => setFundAmount(String(amt))}
                            className="px-2.5 py-1 text-xs rounded-lg bg-white/[0.05] text-white/60 hover:text-white transition-colors">
                            {formatSum(amt)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <DButton onClick={() => fund.mutate()} disabled={!fundChild || !fundAmount || fund.isPending} className="w-full">
                      {fund.isPending ? t("banks.transferring") : t("banks.transfer", { sum: fundAmount ? formatSum(parseFloat(fundAmount)) : "" })}
                    </DButton>
                  </div>
                )}
              </Panel>
            </MotionItem>
          ))}
        </div>
      )}
    </MotionStagger>
  );
}
