"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { I18nextProvider, useTranslation as useReactI18nextTranslation } from "react-i18next";
import i18n from "./client";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALES,
  Locale,
  LocaleInfo,
  resources,
  Dictionary,
} from "./config";
import { setLocaleAction } from "@/app/actions/locale.actions";

interface LocaleContextType {
  locale: Locale;
  setLocale: (newLocale: Locale) => Promise<void>;
  t: Dictionary & ((key: string, options?: any) => string);
  locales: LocaleInfo[];
  currentLocaleInfo: LocaleInfo;
  i18n: typeof i18n;
}

const LocaleContext = React.createContext<LocaleContextType | null>(null);

function InnerLocaleProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale);
  const router = useRouter();
  const { t: i18nTranslate } = useReactI18nextTranslation();

  // Ensure i18next language matches on initial load
  React.useEffect(() => {
    if (i18n.language !== initialLocale) {
      i18n.changeLanguage(initialLocale);
    }
  }, [initialLocale]);

  // Read cookie on mount if available
  React.useEffect(() => {
    try {
      const match = document.cookie.match(new RegExp(`(^| )${LOCALE_COOKIE}=([^;]+)`));
      if (match && (match[2] === "en" || match[2] === "am" || match[2] === "om")) {
        const cookieLoc = match[2] as Locale;
        if (cookieLoc !== locale) {
          setLocaleState(cookieLoc);
          i18n.changeLanguage(cookieLoc);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Update document language tag
  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = React.useCallback(
    async (newLocale: Locale) => {
      if (newLocale === locale) return;

      // 1. Instant client update
      setLocaleState(newLocale);
      await i18n.changeLanguage(newLocale);

      // 2. Set document cookie immediately
      try {
        document.cookie = `${LOCALE_COOKIE}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      } catch {
        // ignore
      }

      // 3. Persist on server and refresh server components
      try {
        await setLocaleAction(newLocale);
        router.refresh();
      } catch (err) {
        console.error("Failed to persist locale preference:", err);
      }
    },
    [locale, router]
  );

  const currentLocaleInfo = React.useMemo(
    () => LOCALES.find((l) => l.code === locale) || LOCALES[0],
    [locale]
  );

  // Provide dual-capability `t`:
  // 1. Function call: t("nav.dashboard") (standard react-i18next)
  // 2. Property access: t.nav.dashboard (type-safe dictionary)
  const currentDict = (resources[locale]?.translation || resources.en.translation) as Dictionary;

  const tHybrid = React.useMemo(() => {
    const fn = (key: string, options?: any) => i18nTranslate(key, options);
    return new Proxy(fn, {
      get(_target, prop: string) {
        if (prop in currentDict) {
          return (currentDict as any)[prop];
        }
        return (i18nTranslate as any)[prop];
      },
    }) as Dictionary & ((key: string, options?: any) => string);
  }, [locale, i18nTranslate, currentDict]);

  const value = React.useMemo(
    () => ({
      locale,
      setLocale,
      t: tHybrid,
      locales: LOCALES,
      currentLocaleInfo,
      i18n,
    }),
    [locale, setLocale, tHybrid, currentLocaleInfo]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function LocaleProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  return (
    <I18nextProvider i18n={i18n}>
      <InnerLocaleProvider initialLocale={initialLocale}>{children}</InnerLocaleProvider>
    </I18nextProvider>
  );
}

export function useTranslation() {
  const context = React.useContext(LocaleContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LocaleProvider");
  }
  return context;
}

export function useLocale() {
  const { locale, setLocale, locales, currentLocaleInfo } = useTranslation();
  return { locale, setLocale, locales, currentLocaleInfo };
}
