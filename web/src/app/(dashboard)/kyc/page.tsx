"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { kycService } from "@/lib/api";
import { Panel, DButton } from "@/components/dark";
import { MotionStagger, MotionItem } from "@/components/motion";
import { BookText, IdCard, Car, ScanFace, CheckCircle2 } from "lucide-react";
import { useT } from "@/i18n/locale";

const DOC_TYPES = [
  { value: "PASSPORT", label: "kyc.docPassport", Icon: BookText },
  { value: "ID_CARD", label: "kyc.docIdCard", Icon: IdCard },
  { value: "DRIVING_LICENSE", label: "kyc.docDriving", Icon: Car },
];

type Step = "intro" | "document" | "liveness" | "done";

function SuccessCard({ title, sub, onHome, homeLabel }: { title: string; sub: string; onHome: () => void; homeLabel: string }) {
  return (
    <Panel className="p-10 flex flex-col items-center gap-3 border-emerald-500/20 bg-emerald-500/[0.06]">
      <CheckCircle2 className="h-12 w-12 text-emerald-400" />
      <p className="font-medium text-emerald-100">{title}</p>
      <p className="text-sm text-emerald-200/70 text-center">{sub}</p>
      <DButton variant="outline" onClick={onHome} className="mt-1">{homeLabel}</DButton>
    </Panel>
  );
}

export default function KycPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const t = useT();

  const { data: status, isLoading } = useQuery({
    queryKey: ["kyc-status"],
    queryFn: async () => (await kycService.getStatus()).data.data ?? null,
  });

  const [step, setStep] = useState<Step>("intro");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [docType, setDocType] = useState("PASSPORT");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const alreadyApproved = status?.status === "APPROVED";

  const handleStartAndUpload = async () => {
    setBusy(true); setError("");
    try {
      const { data: started } = await kycService.start("PARENT");
      const sid = started.data.id;
      setSessionId(sid);
      await kycService.uploadDocument(sid, docType);
      setStep("liveness");
    } catch {
      setError(t("kyc.errStart"));
    } finally { setBusy(false); }
  };

  const handleLiveness = async () => {
    if (!sessionId) return;
    setBusy(true); setError("");
    try {
      const { data } = await kycService.liveness(sessionId);
      if (data.data.status === "APPROVED") {
        setStep("done");
        qc.invalidateQueries({ queryKey: ["kyc-status"] });
        qc.invalidateQueries({ queryKey: ["my-family"] });
      } else {
        setError(t("kyc.errLiveness"));
      }
    } catch {
      setError(t("kyc.errCheck"));
    } finally { setBusy(false); }
  };

  if (isLoading) return <p className="text-white/50">{t("common.loading")}</p>;

  return (
    <MotionStagger className="max-w-xl space-y-6">
      <MotionItem>
        <h1 className="text-2xl font-bold tracking-tight">{t("kyc.title")}</h1>
        <p className="text-white/50 mt-1 text-sm">{t("kyc.subtitle")}</p>
      </MotionItem>

      {alreadyApproved && (
        <MotionItem>
          <SuccessCard
            title={t("kyc.approvedTitle")}
            sub={t("kyc.approvedSub", { date: status?.approvedAt ? new Date(status.approvedAt).toLocaleDateString() : "" })}
            onHome={() => router.push("/dashboard")}
            homeLabel={t("kyc.home")}
          />
        </MotionItem>
      )}

      {!alreadyApproved && (
        <>
          <MotionItem>
            <div className="flex items-center gap-2 text-xs">
              {["kyc.stepDoc", "kyc.stepSelfie", "kyc.stepDone"].map((labelKey, i) => {
                const stepIndex = step === "done" ? 2 : step === "liveness" ? 1 : 0;
                const reached = i <= stepIndex;
                return (
                  <div key={labelKey} className="flex items-center gap-2 flex-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      reached ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white" : "bg-white/10 text-white/40"
                    }`}>{i + 1}</div>
                    <span className={reached ? "text-white" : "text-white/40"}>{t(labelKey)}</span>
                    {i < 2 && <div className="flex-1 h-px bg-white/10" />}
                  </div>
                );
              })}
            </div>
          </MotionItem>

          {(step === "intro" || step === "document") && (
            <MotionItem>
              <Panel className="p-6 space-y-4">
                <div>
                  <p className="font-medium tracking-tight">{t("kyc.step1")}</p>
                  <p className="text-xs text-white/40">{t("kyc.step1Hint")}</p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {DOC_TYPES.map((d) => (
                    <button key={d.value} onClick={() => setDocType(d.value)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl text-left transition-colors ${
                        docType === d.value ? "bg-white/15 ring-1 ring-fuchsia-400/50" : "bg-white/[0.04] hover:bg-white/[0.08]"
                      }`}>
                      <d.Icon className="h-6 w-6 text-white/60" />
                      <span className="text-sm font-medium">{t(d.label)}</span>
                    </button>
                  ))}
                </div>
                {error && <p className="text-sm text-rose-300 bg-rose-500/10 rounded-lg px-3 py-2">{error}</p>}
                <DButton onClick={handleStartAndUpload} disabled={busy} className="w-full">
                  {busy ? t("common.loading") : t("kyc.uploadContinue")}
                </DButton>
              </Panel>
            </MotionItem>
          )}

          {step === "liveness" && (
            <MotionItem>
              <Panel className="p-6 space-y-4">
                <div>
                  <p className="font-medium tracking-tight">{t("kyc.step2")}</p>
                  <p className="text-xs text-white/40">{t("kyc.step2Hint")}</p>
                </div>
                <div className="flex flex-col items-center py-6 gap-2">
                  <div className="w-28 h-28 rounded-full border-4 border-dashed border-white/15 flex items-center justify-center text-white/40">
                    <ScanFace className="h-12 w-12" />
                  </div>
                  <p className="text-sm text-white/40">{t("kyc.lookCamera")}</p>
                </div>
                {error && <p className="text-sm text-rose-300 bg-rose-500/10 rounded-lg px-3 py-2">{error}</p>}
                <DButton onClick={handleLiveness} disabled={busy} className="w-full">
                  {busy ? t("common.checking") : t("kyc.takeSelfie")}
                </DButton>
              </Panel>
            </MotionItem>
          )}

          {step === "done" && (
            <MotionItem>
              <SuccessCard
                title={t("kyc.doneTitle")}
                sub={t("kyc.doneSub")}
                onHome={() => router.push("/dashboard")}
                homeLabel={t("kyc.home")}
              />
            </MotionItem>
          )}

          {status?.status === "REJECTED" && step === "intro" && (
            <p className="text-sm text-rose-300">{t("kyc.rejected", { reason: status.rejectionReason ?? "" })}</p>
          )}
        </>
      )}
    </MotionStagger>
  );
}
