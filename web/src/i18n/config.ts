// Supported UI languages (ТЗ FR-NOT-05 / NFR: локализация uz/ru/en).
export type Locale = "ru" | "uz" | "en";

export const LOCALES: Locale[] = ["ru", "uz", "en"];
export const DEFAULT_LOCALE: Locale = "ru";

// Native names, shown in the language menu.
export const LOCALE_LABELS: Record<Locale, string> = {
  ru: "Русский",
  uz: "O'zbek",
  en: "English",
};

// Short codes for the compact switcher.
export const LOCALE_SHORT: Record<Locale, string> = {
  ru: "RU",
  uz: "UZ",
  en: "EN",
};

export const LOCALE_STORAGE_KEY = "kidscard.locale";
