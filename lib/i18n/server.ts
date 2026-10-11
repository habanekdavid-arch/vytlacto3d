import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, makeT, type Locale } from "@/lib/i18n/config";
import { dictionaryFor } from "@/lib/i18n/messages";

const HEADER_LOCALES: Record<string, Locale> = { en: "en", hu: "hu", de: "de", sk: "sk", cs: "sk" };

/** Jazyk z cookie; pri prvej návšteve podľa jazyka prehliadača. */
export async function getLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const accept = (await headers()).get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const lang = part.trim().slice(0, 2).toLowerCase();
    if (lang in HEADER_LOCALES) return HEADER_LOCALES[lang];
  }
  return DEFAULT_LOCALE;
}

export async function getT() {
  const locale = await getLocale();
  return { locale, t: makeT(dictionaryFor(locale)) };
}
