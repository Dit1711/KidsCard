"use client";

import { LOCALES, LOCALE_LABELS, LOCALE_SHORT } from "@/i18n/config";
import { useLocale } from "@/i18n/locale";

/**
 * Compact RU / UZ / EN segmented control. `variant="dark"` for use on the
 * dark kid screens; default suits the light parent UI.
 */
export function LanguageSwitcher({
  variant = "light",
  className = "",
}: {
  variant?: "light" | "dark";
  className?: string;
}) {
  const { locale, setLocale } = useLocale();

  const wrap =
    variant === "dark"
      ? "bg-white/10 border border-white/10"
      : "bg-muted border border-border";

  return (
    <div
      role="group"
      aria-label="Language"
      className={`inline-flex items-center rounded-full p-0.5 text-xs font-medium ${wrap} ${className}`}
    >
      {LOCALES.map((l) => {
        const active = l === locale;
        const activeCls =
          variant === "dark"
            ? "bg-white text-black"
            : "bg-background text-foreground shadow-sm";
        const idleCls =
          variant === "dark"
            ? "text-white/60 hover:text-white"
            : "text-muted-foreground hover:text-foreground";
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            aria-label={LOCALE_LABELS[l]}
            aria-pressed={active}
            className={`rounded-full px-2.5 py-1 transition-colors ${active ? activeCls : idleCls}`}
          >
            {LOCALE_SHORT[l]}
          </button>
        );
      })}
    </div>
  );
}
