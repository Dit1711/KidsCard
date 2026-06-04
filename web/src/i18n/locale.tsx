"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "./config";
import { dictionaries } from "./dictionaries";
import { setRuntimeLocale } from "./runtime";

type TranslateParams = Record<string, string | number>;

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: TranslateParams) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Lightweight, client-side i18n. We deliberately avoid Next's locale routing
 * (URL segments / middleware) — the app is almost entirely client components,
 * and a context + localStorage is simpler and version-proof. The first render
 * always uses DEFAULT_LOCALE (matching the server) and switches after mount, so
 * there is no hydration mismatch.
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  // Keep the module-level locale in sync for non-React helpers (formatSum,
  // category/period labels). Idempotent assignment during render so children
  // that render after this provider see the active language immediately.
  setRuntimeLocale(locale);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
      if (saved && LOCALES.includes(saved)) setLocaleState(saved);
    } catch {
      /* localStorage unavailable — keep default */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string, params?: TranslateParams) => {
      const value =
        dictionaries[locale]?.[key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key;
      if (!params) return value;
      return Object.entries(params).reduce(
        (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
        value,
      );
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}

/** Convenience hook when a component only needs the translate function. */
export function useT(): LocaleContextValue["t"] {
  return useLocale().t;
}
