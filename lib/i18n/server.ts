import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, makeT, type Locale } from "@/lib/i18n/config";
import { dictionaryFor } from "@/lib/i18n/messages";

const HEADER_LOCALES: Record<string, Locale> = { en: "en", hu: "hu", de: "de", sk: "sk", cs: "sk" };

/** Krajiny, kde návštevník bez vlastnej voľby vždy dostane slovenčinu. */
const SLOVAK_COUNTRIES = new Set(["SK", "CZ"]);

/**
 * Jazyk z cookie (ručná voľba vlajkou); pri prvej návšteve slovenčina pre
 * návštevníkov zo SK/CZ a pre každého, kto má slovenčinu či češtinu kdekoľvek
 * v prehliadači — veľa Slovákov má telefón po anglicky („en-US, sk“) a
 * nesmie dostať anglický obchod. Inak podľa jazyka prehliadača.
 */
export async function getLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const h = await headers();
  const country = (h.get("x-vercel-ip-country") ?? "").toUpperCase();
  if (SLOVAK_COUNTRIES.has(country)) return "sk";
  const accept = h.get("accept-language") ?? "";
  if (/(^|,)\s*(sk|cs)\b/i.test(accept)) return "sk";
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
