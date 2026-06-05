import type { CSSProperties } from "react";
import { getRuntimeLocale } from "@/i18n/runtime";

export interface CardTheme {
  key: string;
  label: string; // RU fallback; use themeLabel(key) for the localized name
  grad: string; // tailwind gradient stops (used with bg-gradient-to-br)
  category: string; // category key — see CARD_CATEGORIES
  /**
   * Optional raster background (kid illustration), served from /public.
   * Until the asset exists the card gracefully falls back to `grad`.
   */
  image?: string;
}

// ── Categories (for the grouped theme picker) ──
export const CARD_CATEGORIES = ["classic", "creatures", "worlds"] as const;

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  ru: { classic: "Классика", creatures: "Существа", worlds: "Миры" },
  uz: { classic: "Klassika", creatures: "Mavjudotlar", worlds: "Olamlar" },
  en: { classic: "Classic", creatures: "Creatures", worlds: "Worlds" },
};

/** Localized category name. */
export function categoryLabel(key: string): string {
  return (CATEGORY_LABELS[getRuntimeLocale()] ?? CATEGORY_LABELS.ru)[key] ?? key;
}

// ── Themes ──
// `classic` = pure gradients (the original set; existing cards reference these keys).
// The illustrated themes carry an `image` (kid art) with a themed gradient fallback.
export const CARD_THEMES: CardTheme[] = [
  // Classic gradients
  { key: "violet", label: "Фиолет", grad: "from-violet-500 to-fuchsia-500", category: "classic" },
  { key: "ocean", label: "Океан", grad: "from-sky-500 to-indigo-500", category: "classic" },
  { key: "sunset", label: "Закат", grad: "from-rose-500 to-orange-400", category: "classic" },
  { key: "forest", label: "Лес", grad: "from-emerald-500 to-teal-500", category: "classic" },
  { key: "gold", label: "Золото", grad: "from-amber-400 to-pink-500", category: "classic" },
  { key: "aurora", label: "Аврора", grad: "from-fuchsia-500 via-purple-500 to-indigo-500", category: "classic" },
  { key: "candy", label: "Карамель", grad: "from-pink-400 to-rose-500", category: "classic" },
  { key: "midnight", label: "Ночь", grad: "from-slate-700 to-slate-900", category: "classic" },

  // Illustrated — creatures
  { key: "dino", label: "Динозавры", grad: "from-emerald-500 to-lime-600", category: "creatures", image: "/card-themes/dino.jpg" },
  { key: "monsters", label: "Монстрики", grad: "from-fuchsia-500 to-violet-600", category: "creatures", image: "/card-themes/monsters.jpg" },
  { key: "dragon", label: "Драконы", grad: "from-amber-500 to-red-600", category: "creatures", image: "/card-themes/dragon.jpg" },
  { key: "unicorn", label: "Единороги", grad: "from-pink-400 via-purple-400 to-indigo-500", category: "creatures", image: "/card-themes/unicorn.jpg" },

  // Illustrated — worlds
  { key: "space", label: "Космос", grad: "from-indigo-600 to-purple-700", category: "worlds", image: "/card-themes/space.jpg" },
  { key: "underwater", label: "Подводный мир", grad: "from-cyan-500 to-blue-600", category: "worlds", image: "/card-themes/underwater.jpg" },
  { key: "robots", label: "Роботы", grad: "from-slate-600 to-cyan-600", category: "worlds", image: "/card-themes/robots.jpg" },
  { key: "racing", label: "Гонки", grad: "from-red-500 to-orange-500", category: "worlds", image: "/card-themes/racing.jpg" },
];

const THEME_BY_KEY: Record<string, CardTheme> = Object.fromEntries(CARD_THEMES.map((t) => [t.key, t]));

const THEME_LABELS: Record<string, Record<string, string>> = {
  ru: {
    violet: "Фиолет", ocean: "Океан", sunset: "Закат", forest: "Лес", gold: "Золото", aurora: "Аврора", candy: "Карамель", midnight: "Ночь",
    dino: "Динозавры", monsters: "Монстрики", dragon: "Драконы", unicorn: "Единороги", space: "Космос", underwater: "Подводный мир", robots: "Роботы", racing: "Гонки",
  },
  uz: {
    violet: "Binafsha", ocean: "Okean", sunset: "Shafaq", forest: "O'rmon", gold: "Oltin", aurora: "Aurora", candy: "Karamel", midnight: "Tun",
    dino: "Dinozavrlar", monsters: "Monstrlar", dragon: "Ajdarlar", unicorn: "Yakkashox", space: "Koinot", underwater: "Suv osti", robots: "Robotlar", racing: "Poyga",
  },
  en: {
    violet: "Violet", ocean: "Ocean", sunset: "Sunset", forest: "Forest", gold: "Gold", aurora: "Aurora", candy: "Candy", midnight: "Midnight",
    dino: "Dinosaurs", monsters: "Monsters", dragon: "Dragons", unicorn: "Unicorns", space: "Space", underwater: "Underwater", robots: "Robots", racing: "Racing",
  },
};

/** Localized card-theme name. */
export function themeLabel(key: string): string {
  return (THEME_LABELS[getRuntimeLocale()] ?? THEME_LABELS.ru)[key] ?? key;
}

export function cardGradient(key: string | null | undefined): string {
  return (key && THEME_BY_KEY[key] ? THEME_BY_KEY[key] : CARD_THEMES[0]).grad;
}

/** Raster background for a theme, or null for pure-gradient (classic) themes. */
export function cardImage(key: string | null | undefined): string | null {
  return (key && THEME_BY_KEY[key]?.image) || null;
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
