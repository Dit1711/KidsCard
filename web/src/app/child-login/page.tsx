"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { childAuthService } from "@/lib/api";
import { useChildStore } from "@/store/child";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-100 via-pink-100 to-purple-100 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🧒💳</div>
          <h1 className="text-2xl font-bold text-purple-700">Привет!</h1>
          <p className="text-gray-500 text-sm mt-1">Вход в твой кошелёк</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Твой код</Label>
              <Input
                id="code"
                placeholder="ABC123"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="text-center text-xl tracking-[0.3em] font-mono uppercase"
                maxLength={8}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl tracking-[0.5em] font-mono"
                maxLength={6}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              type="submit"
              className="w-full h-12 text-base bg-purple-600 hover:bg-purple-700"
              disabled={loading || !code || pin.length < 4}
            >
              {loading ? "Входим…" : "Войти 🚀"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Родитель?{" "}
          <Link href="/login" className="text-purple-600 hover:underline">
            Вход для родителей
          </Link>
        </p>
      </div>
    </div>
  );
}
