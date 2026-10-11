/** Jazyky webu. Slovenčina je pôvodný text priamo v kóde, ostatné sú preklady. */
export const LOCALES = ["sk", "en", "hu", "de"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "sk";
export const LOCALE_COOKIE = "vytlacto3d_lang";

export const LOCALE_INFO: Record<Locale, { code: string; name: string; flag: string; intl: string }> = {
  sk: { code: "SK", name: "Slovenčina", flag: "🇸🇰", intl: "sk-SK" },
  en: { code: "EN", name: "English", flag: "🇬🇧", intl: "en-GB" },
  hu: { code: "HU", name: "Magyar", flag: "🇭🇺", intl: "hu-HU" },
  de: { code: "DE", name: "Deutsch", flag: "🇩🇪", intl: "de-DE" },
};

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

export type TranslateVars = Record<string, string | number>;
export type TFunction = (text: string, vars?: TranslateVars) => string;

/** Doplní {premenné} do textu. */
export function interpolate(text: string, vars?: TranslateVars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, key) => (key in vars ? String(vars[key]) : m));
}

/** Preklad podľa slovníka; chýbajúci preklad = pôvodný slovenský text. */
export function makeT(dict: Record<string, string>): TFunction {
  return (text, vars) => interpolate(dict[text] ?? text, vars);
}
