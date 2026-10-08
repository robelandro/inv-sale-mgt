import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, Locale, resources, Dictionary } from "./config";

export async function getServerLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined;
    if (cookieVal && (cookieVal === "en" || cookieVal === "am" || cookieVal === "om")) {
      return cookieVal;
    }
  } catch {
    // cookies() might fail in static context, fallback to default
  }
  return DEFAULT_LOCALE;
}

export async function getServerTranslations(): Promise<{ locale: Locale; t: Dictionary }> {
  const locale = await getServerLocale();
  const dict = resources[locale]?.translation || resources.en.translation;
  return {
    locale,
    t: dict as Dictionary,
  };
}
