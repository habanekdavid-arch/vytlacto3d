"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, makeT, type Locale, type TFunction } from "@/lib/i18n/config";

type Ctx = { locale: Locale; t: TFunction };

const LocaleContext = createContext<Ctx>({ locale: DEFAULT_LOCALE, t: makeT({}) });

/** Slovník pre aktuálny jazyk posiela layout zo servera — do JS balíka sa preklady nedostanú. */
export function LocaleProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Record<string, string>;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ locale, t: makeT(dict) }), [locale, dict]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useT(): TFunction {
  return useContext(LocaleContext).t;
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}
