"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Golos_Text } from "next/font/google";
import { Wallet, ArrowRight } from "lucide-react";
import { childAuthService } from "@/lib/api";
import { useChildStore } from "@/store/child";

const golos = Golos_Text({ subsets: ["latin", "cyrillic"], display: "swap" });

export default function ChildLoginPage() {
  const router = useRouter();
  const { setSession } = useChildStore();

  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await childAuthService.login(code, pin);
      const d = data.data;
      setSession(d.accessToken, d.childId, d.familyId, d.displayName);
      router.push("/kid");
    } catch {
      setError("Неверный код или PIN. Попроси родителя проверить.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 overflow-y-auto bg-[#08080f] text-white flex items-center justify-center p-4 ${golos.className}`}>
      {/* glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-20 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute -bottom-28 -right-20 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-fuchsia-500/20">
            <Wallet className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Привет!</h1>
          <p className="text-white/50 text-sm mt-1">Вход в твой кошелёк</p>
        </div>

        <div className="rounded-3xl bg-white/[0.04] border border-white/[0.07] p-6">
          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
            <div className="space-y-1.5">
              <label htmlFor="code" className="block text-sm text-white/60">Твой код</label>
              <input
                id="code"
                name="kid-code"
                autoComplete="off"
                placeholder="ABC123"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3.5 py-3 text-center text-xl tracking-[0.3em] font-mono uppercase text-white placeholder:text-white/25 outline-none transition-colors focus:border-fuchsia-400/60 focus:bg-white/[0.07]"
                maxLength={8}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="pin" className="block text-sm text-white/60">PIN</label>
              <input
                id="pin"
                name="kid-pin"
                autoComplete="off"
                type="password"
                inputMode="numeric"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3.5 py-3 text-center text-2xl tracking-[0.5em] font-mono text-white placeholder:text-white/25 outline-none transition-colors focus:border-fuchsia-400/60 focus:bg-white/[0.07]"
                maxLength={6}
              />
            </div>
            {error && <p className="text-sm text-rose-300 bg-rose-500/10 rounded-lg px-3 py-2">{error}</p>}
            <button
              type="submit"
              className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white inline-flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080f]"
              disabled={loading || !code || pin.length < 4}
            >
              {loading ? "Входим…" : <>Войти <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/40 mt-6">
          Родитель?{" "}
          <Link href="/login" className="text-fuchsia-300 hover:underline">
            Вход для родителей
          </Link>
        </p>
      </div>
    </div>
  );
}
