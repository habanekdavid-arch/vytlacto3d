"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Kopírovanie hodnoty jedného políčka v detaile objednávky.
 *
 * Nekreslí sa, keď políčko nič nenesie — prázdna hodnota alebo pomlčka,
 * ktorou sa v detaile zapisuje "nevyplnené", sa kopírovať neoplatí.
 */
export default function CopyValueButton({
  value,
  label,
  tone = "light",
}: {
  value: string;
  label: string;
  tone?: "light" | "dark";
}) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Po odchode zo stránky by časovač siahol na odmontovaný komponent.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const text = value.trim();

  if (text === "" || text === "—") return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback pre staršie prehliadače a stránky bez zabezpečeného spojenia.
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }

    setCopied(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 1500);
  }

  const colors = copied
    ? "text-green-600"
    : tone === "dark"
    ? "text-neutral-500 hover:text-[#FFAE00]"
    : "text-neutral-400 hover:text-[#FFAE00]";

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Skopírované" : `Kopírovať: ${label}`}
      aria-label={copied ? "Skopírované" : `Kopírovať ${label}`}
      className={["shrink-0 transition", colors].join(" ")}
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}
