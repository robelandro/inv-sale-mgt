"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LOCALE, resources, Locale } from "./config";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
}

export default i18n;
