import { DEFAULT_LOCALE, type Locale } from "./config";

// Module-level "current locale" for non-React helpers (formatSum, category /
// period labels) that can't use the useT() hook. The LocaleProvider keeps this
// in sync on every render, so these helpers reflect the active language.
let current: Locale = DEFAULT_LOCALE;

export function setRuntimeLocale(locale: Locale): void {
  current = locale;
}

export function getRuntimeLocale(): Locale {
  return current;
}
