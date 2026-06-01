"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { kycService } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const DOC_TYPES = [
  { value: "PASSPORT", label: "Паспорт", icon: "📘" },
  { value: "ID_CARD", label: "ID-карта", icon: "🪪" },
  { value: "DRIVING_LICENSE", label: "Водительские права", icon: "🚗" },
];

type Step = "intro" | "document" | "liveness" | "done";

export default function KycPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ["kyc-status"],
    queryFn: async () => {
      const { data } = await kycService.getStatus();
      return data.data ?? null;
    },
  });

  const [step, setStep] = useState<Step>("intro");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [docType, setDocType] = useState("PASSPORT");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const alreadyApproved = status?.status === "APPROVED";

  const handleStartAndUpload = async () => {
    setBusy(true);
    setError("");
    try {
      const { data: started } = await kycService.start("PARENT");
      const sid = started.data.id;
      setSessionId(sid);
      await kycService.uploadDocument(sid, docType);
      setStep("liveness");
    } catch {
      setError("Не удалось начать верификацию. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  };

  const handleLiveness = async () => {
    if (!sessionId) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await kycService.liveness(sessionId);
      if (data.data.status === "APPROVED") {
        setStep("done");
        qc.invalidateQueries({ queryKey: ["kyc-status"] });
        qc.invalidateQueries({ queryKey: ["my-family"] });
      } else {
        setError("Проверка не пройдена. Попробуйте ещё раз.");
      }
    } catch {
      setError("Ошибка проверки. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return <p className="text-gray-400">Загрузка…</p>;
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Верификация личности</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Требуется для выпуска карт и соответствия требованиям ЦБ РУз
        </p>
      </div>

      {/* Already approved */}
      {alreadyApproved && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex flex-col items-center py-10 gap-3">
            <span className="text-5xl">✅</span>
            <p className="font-medium text-green-800">Личность подтверждена</p>
            <p className="text-sm text-green-600">
              Верификация пройдена{" "}
              {status?.approvedAt &&
                new Date(status.approvedAt).toLocaleDateString("ru-RU")}
            </p>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              На главную
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Flow */}
      {!alreadyApproved && (
        <>
          {/* Progress */}
          <div className="flex items-center gap-2 text-xs">
            {["Документ", "Селфи", "Готово"].map((label, i) => {
              const active =
                (step === "intro" || step === "document") ? i === 0 :
                step === "liveness" ? i === 1 : i <= 2;
              const stepIndex = step === "done" ? 2 : step === "liveness" ? 1 : 0;
              const reached = i <= stepIndex;
              return (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      reached ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className={reached ? "text-gray-900" : "text-gray-400"}>{label}</span>
                  {i < 2 && <div className="flex-1 h-px bg-gray-200" />}
                </div>
              );
            })}
          </div>

          {(step === "intro" || step === "document") && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Шаг 1. Документ</CardTitle>
                <CardDescription>
                  Выберите тип документа. В демо-режиме загрузка имитируется.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  {DOC_TYPES.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setDocType(d.value)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                        docType === d.value
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-gray-200 hover:border-indigo-300"
                      }`}
                    >
                      <span className="text-2xl">{d.icon}</span>
                      <span className="text-sm font-medium">{d.label}</span>
                    </button>
                  ))}
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button onClick={handleStartAndUpload} disabled={busy} className="w-full">
                  {busy ? "Загрузка…" : "Загрузить и продолжить"}
                </Button>
              </CardContent>
            </Card>
          )}

          {step === "liveness" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Шаг 2. Селфи (liveness)</CardTitle>
                <CardDescription>
                  Сверка лица с документом. В демо-режиме проверка проходит автоматически.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center py-6 gap-2">
                  <div className="w-28 h-28 rounded-full border-4 border-dashed border-indigo-200 flex items-center justify-center text-4xl">
                    🤳
                  </div>
                  <p className="text-sm text-gray-400">Посмотрите в камеру</p>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button onClick={handleLiveness} disabled={busy} className="w-full">
                  {busy ? "Проверка…" : "Сделать селфи"}
                </Button>
              </CardContent>
            </Card>
          )}

          {step === "done" && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="flex flex-col items-center py-10 gap-3">
                <span className="text-5xl">🎉</span>
                <p className="font-medium text-green-800">Верификация пройдена!</p>
                <p className="text-sm text-green-600 text-center">
                  Личность подтверждена. Теперь доступны все возможности платформы.
                </p>
                <Button onClick={() => router.push("/dashboard")}>На главную</Button>
              </CardContent>
            </Card>
          )}

          {status?.status === "REJECTED" && step === "intro" && (
            <p className="text-sm text-red-500">
              Предыдущая попытка отклонена: {status.rejectionReason}. Начните заново.
            </p>
          )}
        </>
      )}
    </div>
  );
}
