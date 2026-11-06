"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";
import { applyTheme, readThemeChoice, type ThemeChoice } from "@/lib/theme";

const NEXT: Record<ThemeChoice, ThemeChoice> = { auto: "dark", dark: "light", light: "auto" };
const LABEL: Record<ThemeChoice, string> = {
  auto: "Režim: podľa zariadenia",
  dark: "Režim: tmavý",
  light: "Režim: svetlý",
};

/** Prepínač Automaticky → Tmavý → Svetlý. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const t = useT();
  const [choice, setChoice] = useState<ThemeChoice>("auto");

  useEffect(() => {
    setChoice(readThemeChoice());
    // „Automaticky“ sleduje zmenu nastavenia systému aj počas návštevy.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readThemeChoice() === "auto") applyTheme("auto");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const label = t(LABEL[choice]);
  return (
    <button
      type="button"
      onClick={() => {
        const next = NEXT[choice];
        setChoice(next);
        applyTheme(next);
      }}
      title={label}
      aria-label={label}
      className={`flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 shadow-sm transition hover:border-[#FFAE00] ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {choice === "dark" ? (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        ) : choice === "light" ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" />
          </>
        )}
      </svg>
    </button>
  );
}
