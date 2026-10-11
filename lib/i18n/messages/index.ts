import type { Locale } from "@/lib/i18n/config";
import account from "./account";
import checkout from "./checkout";
import community from "./community";
import configurator from "./configurator";
import content from "./content";
import home from "./home";
import layout from "./layout";

/**
 * Preklady sú kľúčované pôvodným slovenským textom — v kóde ostáva
 * čitateľná slovenčina a chýbajúci preklad sa ukáže po slovensky.
 */
export type Messages = Record<string, { en: string; hu: string; de: string }>;

const ALL: Messages = {
  ...account,
  ...checkout,
  ...community,
  ...configurator,
  ...content,
  ...home,
  ...layout,
};

const cache = new Map<Locale, Record<string, string>>();

export function dictionaryFor(locale: Locale): Record<string, string> {
  if (locale === "sk") return {};
  let dict = cache.get(locale);
  if (!dict) {
    dict = {};
    for (const [sk, tr] of Object.entries(ALL)) dict[sk] = tr[locale];
    cache.set(locale, dict);
  }
  return dict;
}
