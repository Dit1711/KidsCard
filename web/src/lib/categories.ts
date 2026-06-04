// Single source of truth for spend categories (MCC) and limit periods,
// shared by the parent limits/analytics pages and the child shop/home.
import { UtensilsCrossed, Gamepad2, ToyBrick, ShoppingBag, Package, type LucideIcon } from "lucide-react";
import { getRuntimeLocale } from "@/i18n/runtime";

export interface SpendCategory {
  mcc: string;
  label: string; // RU fallback — use catLabel(mcc) for the active language
  icon: string; // emoji — used in the playful child cabinet
  Icon: LucideIcon; // line icon — used in the parent (serious) UI
  color: string; // hex, used by charts/bars
}

export const CATEGORIES: SpendCategory[] = [
  { mcc: "5814", label: "Еда", icon: "🍔", Icon: UtensilsCrossed, color: "#f97316" },
  { mcc: "5816", label: "Игры", icon: "🎮", Icon: Gamepad2, color: "#8b5cf6" },
  { mcc: "5945", label: "Игрушки", icon: "🧸", Icon: ToyBrick, color: "#ec4899" },
  { mcc: "5999", label: "Другое", icon: "🛒", Icon: ShoppingBag, color: "#3b82f6" },
];

const FALLBACK: SpendCategory = { mcc: "0000", label: "Прочее", icon: "•", Icon: Package, color: "#94a3b8" };

export function categoryByMcc(mcc: string | null | undefined): SpendCategory {
  return CATEGORIES.find((c) => c.mcc === mcc) ?? FALLBACK;
}

// mcc → localized category name
const CAT_LABELS: Record<string, Record<string, string>> = {
  ru: { "5814": "Еда", "5816": "Игры", "5945": "Игрушки", "5999": "Другое", "0000": "Прочее" },
  uz: { "5814": "Ovqat", "5816": "O'yinlar", "5945": "O'yinchoqlar", "5999": "Boshqa", "0000": "Boshqa" },
  en: { "5814": "Food", "5816": "Games", "5945": "Toys", "5999": "Other", "0000": "Other" },
};

/** Localized category name for an MCC. */
export function catLabel(mcc: string | null | undefined): string {
  const table = CAT_LABELS[getRuntimeLocale()] ?? CAT_LABELS.ru;
  return table[mcc ?? "0000"] ?? table["0000"];
}

/** "🍔 Еда" — icon + localized label, for compact labels. */
export function categoryLabel(mcc: string | null | undefined): string {
  return `${categoryByMcc(mcc).icon} ${catLabel(mcc)}`;
}

const PERIOD: Record<string, Record<string, string>> = {
  ru: { DAILY: "Дневной", WEEKLY: "Недельный", MONTHLY: "Месячный" },
  uz: { DAILY: "Kunlik", WEEKLY: "Haftalik", MONTHLY: "Oylik" },
  en: { DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly" },
};

/** Localized period name (Daily / Weekly / Monthly). */
export function periodLabel(type: string): string {
  return (PERIOD[getRuntimeLocale()] ?? PERIOD.ru)[type] ?? type;
}

const PERIOD_REMAINING: Record<string, Record<string, string>> = {
  ru: { DAILY: "На сегодня", WEEKLY: "На неделю", MONTHLY: "На месяц" },
  uz: { DAILY: "Bugunga", WEEKLY: "Haftaga", MONTHLY: "Oyga" },
  en: { DAILY: "For today", WEEKLY: "For the week", MONTHLY: "For the month" },
};

/** Kid-friendly "how much is left" period wording (localized). */
export function periodRemainingLabel(type: string): string {
  return (PERIOD_REMAINING[getRuntimeLocale()] ?? PERIOD_REMAINING.ru)[type] ?? type;
}
