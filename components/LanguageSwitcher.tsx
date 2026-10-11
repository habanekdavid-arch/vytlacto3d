"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_COOKIE, LOCALE_INFO, type Locale } from "@/lib/i18n/config";
import { useLocale, useT } from "@/lib/i18n/client";
import FlagIcon from "@/components/FlagIcon";

function saveLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = locale;
}

/** Prepínač jazyka v pravom hornom rohu. Voľba sa uloží do cookie na rok. */
export default function LanguageSwitcher() {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  function choose(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    saveLocale(next);
    router.refresh();
  }

  const current = LOCALE_INFO[locale];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("Zmeniť jazyk")}
        className="flex h-10 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-2.5 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-[#FFAE00] hover:shadow-md"
      >
        <FlagIcon locale={locale} />
        <span>{current.code}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={open ? "rotate-180 transition" : "transition"}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t("Jazyk")}
          className="absolute right-0 top-12 z-[60] w-44 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-1 shadow-xl"
        >
          {LOCALES.map((l) => (
            <li key={l}>
              <button
                type="button"
                role="option"
                aria-selected={l === locale}
                onClick={() => choose(l)}
                className={[
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition",
                  l === locale ? "bg-[#FFAE00]/15 font-bold text-neutral-900" : "text-neutral-700 hover:bg-neutral-50",
                ].join(" ")}
              >
                <FlagIcon locale={l} />
                <span className="flex-1">{LOCALE_INFO[l].name}</span>
                <span className="text-xs text-neutral-400">{LOCALE_INFO[l].code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Jazyky ako rad tlačidiel — v mobilnom menu, kde na rozbaľovací zoznam nie je miesto. */
export function LanguageButtons() {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();

  return (
    <div className="flex items-center gap-2" role="group" aria-label={t("Jazyk")}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={l === locale}
          onClick={() => {
            if (l === locale) return;
            saveLocale(l);
            router.refresh();
          }}
          className={[
            "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-bold transition",
            l === locale ? "border-[#FFAE00] bg-[#FFAE00]/15 text-neutral-900" : "border-neutral-200 bg-white text-neutral-600",
          ].join(" ")}
        >
          <FlagIcon locale={l} />
          {LOCALE_INFO[l].code}
        </button>
      ))}
    </div>
  );
}
