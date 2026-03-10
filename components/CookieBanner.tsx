"use client";

import { useEffect, useState } from "react";

type Consent = "accepted" | "rejected";

const KEY = "vytlacto3d_cookie_consent";
const OPEN_EVENT = "vytlacto3d:open-cookie-banner";

export default function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // 1) prvýkrát: ak nie je uložené, ukáž banner
    try {
      const v = window.localStorage.getItem(KEY) as Consent | null;
      if (!v) setOpen(true);
    } catch {
      setOpen(true);
    }

    // 2) listener na otvorenie banneru z footeru
    function onOpen() {
      setOpen(true);
    }

    window.addEventListener(OPEN_EVENT, onOpen as EventListener);

    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen as EventListener);
    };
  }, []);

  function setConsent(consent: Consent) {
    try {
      window.localStorage.setItem(KEY, consent);
    } catch {
      // ignore
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] px-4 pb-4">
      <div className="mx-auto max-w-5xl rounded-2xl border border-neutral-200 bg-white shadow-xl">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="pr-0 md:pr-6">
            <div className="text-sm font-semibold text-neutral-900">
              Cookies na VytlačTo<span className="text-brand">3D</span>
            </div>

            <p className="mt-2 text-sm font-normal text-neutral-600">
              Používame nevyhnutné cookies na správne fungovanie webu (napr. bezpečnosť a
              základné nastavenia). Voliteľné analytické cookies momentálne nepoužívame.
              Viac v{" "}
              <a href="/gdpr" className="underline">
                GDPR
              </a>
              .
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => setConsent("rejected")}
              className="btn-outline"
            >
              Odmietnuť
            </button>

            <button
              type="button"
              onClick={() => setConsent("accepted")}
              className="btn-primary"
            >
              Prijať
            </button>
          </div>
        </div>

        <div className="border-t border-neutral-200 px-5 py-3 text-xs font-normal text-neutral-500">
          Voľbu môžeš kedykoľvek zmeniť cez{" "}
          <span className="font-semibold text-neutral-700">Nastavenia cookies</span> v pätičke.
        </div>
      </div>
    </div>
  );
}