import en from "@/locales/en.json";
import am from "@/locales/am.json";
import om from "@/locales/om.json";

export type Locale = "en" | "am" | "om";

export interface LocaleInfo {
  code: Locale;
  name: string;
  nativeName: string;
  flag: string;
}

export const LOCALES: LocaleInfo[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "am", name: "Amharic", nativeName: "አማርኛ", flag: "🇪🇹" },
  { code: "om", name: "Afaan Oromoo", nativeName: "Afaan Oromoo", flag: "🇪🇹" },
];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const resources = {
  en: { translation: en },
  am: { translation: am },
  om: { translation: om },
} as const;

export type Dictionary = typeof en;
