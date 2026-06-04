import { getRuntimeLocale } from "@/i18n/runtime";

// Currency word per language (same currency, localized spelling).
const CURRENCY: Record<string, string> = { ru: "сум", uz: "so'm", en: "UZS" };

/** Format an UZS amount for display: "1 234 сум" (localized), or "—". */
export function formatSum(uzs: number | null | undefined): string {
  if (uzs == null) return "—";
  const suffix = CURRENCY[getRuntimeLocale()] ?? "сум";
  return new Intl.NumberFormat("ru-UZ").format(uzs) + " " + suffix;
}
