"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authService } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useT } from "@/i18n/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Step = "phone" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const { setTokens } = useAuthStore();
  const t = useT();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("+998");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authService.login(phone);
      setStep("otp");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message || t("login.notFound"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await authService.verifyLogin(phone, otp);
      setTokens(data.data.accessToken, data.data.refreshToken);
      router.push("/dashboard");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message || t("common.wrongOtp"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-soft rounded-2xl">
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-2xl tracking-tight">{t("login.title")}</CardTitle>
        <CardDescription className="text-sm">
          {step === "phone"
            ? t("login.subtitle")
            : t("login.otpSentTo", { phone })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">{t("login.phoneLabel")}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+998901234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
            )}
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? t("common.sending") : t("login.getCode")}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              {t("login.noAccount")}{" "}
              <Link href="/register" className="text-primary font-medium hover:underline">
                {t("common.register")}
              </Link>
            </p>
            <div className="pt-2 mt-2 border-t border-border/70">
              <Link
                href="/child-login"
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                {t("common.childLogin")}
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">{t("login.otpLabel")}</Label>
              <Input
                id="otp"
                type="text"
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl tracking-[0.5em] font-mono"
                autoFocus
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
            )}
            <Button type="submit" className="w-full h-11" disabled={loading || otp.length !== 6}>
              {loading ? t("common.checking") : t("common.signIn")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
            >
              {t("common.changeNumber")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
