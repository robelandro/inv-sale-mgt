"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, Locale } from "@/lib/i18n/types";
import { revalidatePath } from "next/cache";

export async function setLocaleAction(locale: Locale) {
  if (locale !== "en" && locale !== "am" && locale !== "om") {
    return { success: false, error: "Invalid locale" };
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60, // 1 year
    sameSite: "lax",
    httpOnly: false, // allow client-side reading for immediate hydration
  });

  revalidatePath("/", "layout");
  return { success: true, locale };
}
