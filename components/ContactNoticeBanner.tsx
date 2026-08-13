"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "vytlacto3d:contact-notice-dismissed";

export default function ContactNoticeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore unavailable localStorage
    }
  }

  if (!visible) return null;

  return (
    <div className="animate-fade-up relative mb-6 flex items-start gap-3 rounded-2xl border border-[#FFAE00]/40 bg-[#FFF8E1] px-4 py-3 shadow-sm">
      <span className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFAE00]">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FFAE00] opacity-40" />
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="black"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="relative"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </span>

      <p className="flex-1 pt-1 text-sm leading-relaxed text-neutral-800">
        Máte pri modeli akýkoľvek problém alebo špecifickú požiadavku?{" "}
        <a
          href="#faq"
          className="font-semibold text-neutral-900 underline decoration-[#FFAE00] decoration-2 underline-offset-2 hover:text-black"
        >
          Napíšte nám cez kontaktný formulár
        </a>{" "}
        — radi vám pomôžeme.
      </p>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Zavrieť upozornenie"
        className="shrink-0 rounded-full p-1 text-neutral-500 transition hover:bg-black/5 hover:text-neutral-900"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
