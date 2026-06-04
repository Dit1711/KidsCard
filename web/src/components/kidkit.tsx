"use client";

// Shared building blocks for the gamified teen (11–16) kid cabinet.
// Dark base + violet→fuchsia accents, streak orange, league gold.

import * as React from "react";
import { Flame } from "lucide-react";
import { getRuntimeLocale } from "@/i18n/runtime";
import { useT } from "@/i18n/locale";

export const LEAGUE_META: Record<string, { label: string; color: string; ring: string }> = {
  BRONZE: { label: "Бронза", color: "#d39b6a", ring: "ring-amber-700/40" },
  SILVER: { label: "Серебро", color: "#cbd5e1", ring: "ring-slate-300/40" },
  GOLD: { label: "Золото", color: "#fbbf24", ring: "ring-amber-400/50" },
  PLATINUM: { label: "Платина", color: "#67e8f9", ring: "ring-cyan-300/50" },
};

const LEAGUE_LABELS: Record<string, Record<string, string>> = {
  ru: { BRONZE: "Бронза", SILVER: "Серебро", GOLD: "Золото", PLATINUM: "Платина" },
  uz: { BRONZE: "Bronza", SILVER: "Kumush", GOLD: "Oltin", PLATINUM: "Platina" },
  en: { BRONZE: "Bronze", SILVER: "Silver", GOLD: "Gold", PLATINUM: "Platinum" },
};

/** Localized league name. */
export function leagueLabel(key: string): string {
  return (LEAGUE_LABELS[getRuntimeLocale()] ?? LEAGUE_LABELS.ru)[key] ?? key;
}

/** Dark rounded panel. */
export function KCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-3xl bg-white/[0.04] border border-white/[0.07] ${className ?? "p-4"}`}>{children}</div>
  );
}

/** Circular avatar with an XP progress ring. */
export function XpRing({
  initial,
  pct,
  size = 56,
  accent = "#e879f9",
}: {
  initial: string;
  pct: number;
  size?: number;
  accent?: string;
}) {
  const r = size / 2 - 3;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" style={{ width: size, height: size }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${circ * Math.min(1, Math.max(0, pct))} ${circ}`}
        />
      </svg>
      <div className="absolute inset-[5px] rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center font-bold text-white">
        {initial}
      </div>
    </div>
  );
}

/** Streak flame chip. */
export function StreakChip({ days }: { days: number }) {
  const t = useT();
  const lit = days > 0;
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 border ${
        lit ? "bg-orange-500/15 border-orange-500/30" : "bg-white/[0.04] border-white/10"
      }`}
      title={lit ? t("kk.streakDays", { days }) : t("kk.streakBroken")}
    >
      <Flame className={`h-4 w-4 ${lit ? "text-orange-400" : "text-white/30"}`} />
      <span className={`text-sm font-bold ${lit ? "text-orange-300" : "text-white/40"}`}>{days}</span>
    </div>
  );
}

/** Thin XP / progress bar. */
export function XpBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`h-2.5 rounded-full bg-white/10 overflow-hidden ${className ?? ""}`}>
      <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" style={{ width: `${pct}%` }} />
    </div>
  );
}
