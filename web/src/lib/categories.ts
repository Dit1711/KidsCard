// Single source of truth for spend categories (MCC) and limit periods,
// shared by the parent limits/analytics pages and the child shop/home.

export interface SpendCategory {
  mcc: string;
  label: string;
  icon: string;
  color: string; // hex, used by charts/bars
}

export const CATEGORIES: SpendCategory[] = [
  { mcc: "5814", label: "Еда", icon: "🍔", color: "#f97316" },
  { mcc: "5816", label: "Игры", icon: "🎮", color: "#8b5cf6" },
  { mcc: "5945", label: "Игрушки", icon: "🧸", color: "#ec4899" },
  { mcc: "5999", label: "Другое", icon: "🛒", color: "#3b82f6" },
];

const FALLBACK: SpendCategory = { mcc: "0000", label: "Прочее", icon: "•", color: "#94a3b8" };

export function categoryByMcc(mcc: string | null | undefined): SpendCategory {
  return CATEGORIES.find((c) => c.mcc === mcc) ?? FALLBACK;
}

/** "🍔 Еда" — icon + label, for compact labels. */
export function categoryLabel(mcc: string | null | undefined): string {
  const c = categoryByMcc(mcc);
  return `${c.icon} ${c.label}`;
}

export const PERIOD_LABELS: Record<string, string> = {
  DAILY: "Дневной",
  WEEKLY: "Недельный",
  MONTHLY: "Месячный",
};

/** Kid-friendly "how much is left" period wording. */
export const PERIOD_REMAINING_LABELS: Record<string, string> = {
  DAILY: "На сегодня",
  WEEKLY: "На неделю",
  MONTHLY: "На месяц",
};
