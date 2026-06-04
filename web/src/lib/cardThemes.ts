import type { CSSProperties } from "react";
import { getRuntimeLocale } from "@/i18n/runtime";

export interface CardTheme {
  key: string;
  label: string; // RU fallback; use themeLabel(key) for the localized name
  grad: string; // tailwind gradient stops (used with bg-gradient-to-br)
}

export const CARD_THEMES: CardTheme[] = [
  { key: "violet", label: "Фиолет", grad: "from-violet-500 to-fuchsia-500" },
  { key: "ocean", label: "Океан", grad: "from-sky-500 to-indigo-500" },
  { key: "sunset", label: "Закат", grad: "from-rose-500 to-orange-400" },
  { key: "forest", label: "Лес", grad: "from-emerald-500 to-teal-500" },
  { key: "gold", label: "Золото", grad: "from-amber-400 to-pink-500" },
  { key: "aurora", label: "Аврора", grad: "from-fuchsia-500 via-purple-500 to-indigo-500" },
  { key: "candy", label: "Карамель", grad: "from-pink-400 to-rose-500" },
  { key: "midnight", label: "Ночь", grad: "from-slate-700 to-slate-900" },
];

const THEME_LABELS: Record<string, Record<string, string>> = {
  ru: { violet: "Фиолет", ocean: "Океан", sunset: "Закат", forest: "Лес", gold: "Золото", aurora: "Аврора", candy: "Карамель", midnight: "Ночь" },
  uz: { violet: "Binafsha", ocean: "Okean", sunset: "Shafaq", forest: "O'rmon", gold: "Oltin", aurora: "Aurora", candy: "Karamel", midnight: "Tun" },
  en: { violet: "Violet", ocean: "Ocean", sunset: "Sunset", forest: "Forest", gold: "Gold", aurora: "Aurora", candy: "Candy", midnight: "Midnight" },
};

/** Localized card-theme name. */
export function themeLabel(key: string): string {
  return (THEME_LABELS[getRuntimeLocale()] ?? THEME_LABELS.ru)[key] ?? key;
}

export function cardGradient(key: string | null | undefined): string {
  return (CARD_THEMES.find((t) => t.key === key) ?? CARD_THEMES[0]).grad;
}

export interface CardPattern {
  key: string;
  label: string; // RU fallback; use patternLabel(key) for the localized name
}

export const CARD_PATTERNS: CardPattern[] = [
  { key: "none", label: "Без узора" },
  { key: "dots", label: "Точки" },
  { key: "grid", label: "Сетка" },
  { key: "diagonal", label: "Полосы" },
  { key: "rings", label: "Круги" },
];

const PATTERN_LABELS: Record<string, Record<string, string>> = {
  ru: { none: "Без узора", dots: "Точки", grid: "Сетка", diagonal: "Полосы", rings: "Круги" },
  uz: { none: "Naqshsiz", dots: "Nuqtalar", grid: "To'r", diagonal: "Chiziqlar", rings: "Doiralar" },
  en: { none: "No pattern", dots: "Dots", grid: "Grid", diagonal: "Stripes", rings: "Rings" },
};

/** Localized card-pattern name. */
export function patternLabel(key: string): string {
  return (PATTERN_LABELS[getRuntimeLocale()] ?? PATTERN_LABELS.ru)[key] ?? key;
}

export function patternStyle(key: string | null | undefined): CSSProperties {
  switch (key) {
    case "dots":
      return {
        backgroundImage: "radial-gradient(rgba(255,255,255,0.25) 1.2px, transparent 1.2px)",
        backgroundSize: "14px 14px",
      };
    case "grid":
      return {
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      };
    case "diagonal":
      return {
        backgroundImage:
          "repeating-linear-gradient(45deg, rgba(255,255,255,0.10) 0, rgba(255,255,255,0.10) 2px, transparent 2px, transparent 12px)",
      };
    case "rings":
      return {
        backgroundImage:
          "radial-gradient(circle at 85% 15%, rgba(255,255,255,0.18) 0 24px, transparent 25px), radial-gradient(circle at 85% 15%, rgba(255,255,255,0.12) 40px 41px, transparent 42px)",
      };
    default:
      return {};
  }
}
