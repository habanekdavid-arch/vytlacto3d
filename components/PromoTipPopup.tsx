"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "vytlacto3d:promo-popup-last-seen";
const SHOW_AFTER_HOURS = 24;

const tips = [
  {
    badge: "Rýchly prototyp",
    title: "Máte nápad? Premeníme ho na fyzický model.",
    text: "Nahrajte STL, OBJ alebo SVG súbor a okamžite si nastavte materiál, farbu, výplň aj cenu.",
  },
  {
    badge: "Výroba na mieru",
    title: "Diel, ktorý neexistuje? Vieme ho vytlačiť.",
    text: "3D tlač je ideálna na náhradné diely, držiaky, prototypy aj malé série bez drahých foriem.",
  },
  {
    badge: "Online kalkulácia",
    title: "Cenu vidíte ešte pred objednávkou.",
    text: "Konfigurátor automaticky vypočíta cenu podľa objemu, materiálu, kvality a počtu kusov.",
  },
  {
    badge: "SVG na 3D",
    title: "Aj SVG vieme pretvoriť na 3D model.",
    text: "Nahrajte grafiku alebo tvar v SVG a nastavte mu vlastnú hrúbku pre 3D tlač.",
  },
];

function shouldShowPopup() {
  if (typeof window === "undefined") return false;

  const lastSeen = window.localStorage.getItem(STORAGE_KEY);

  if (!lastSeen) return true;

  const lastSeenTime = Number(lastSeen);

  if (!Number.isFinite(lastSeenTime)) return true;

  const hoursPassed = (Date.now() - lastSeenTime) / 1000 / 60 / 60;

  return hoursPassed >= SHOW_AFTER_HOURS;
}

export default function PromoTipPopup() {
  const [visible, setVisible] = useState(false);

  const tip = useMemo(() => {
    return tips[Math.floor(Math.random() * tips.length)];
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (shouldShowPopup()) {
        setVisible(true);
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, []);

  function closePopup() {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisible(false);
  }

  function goToConfigurator() {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisible(false);

    const target = document.getElementById("kalkulator");

    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else {
      window.location.href = "/#kalkulator";
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[80] w-[calc(100%-48px)] max-w-sm animate-[promoIn_0.55s_ease-out]">
      <div className="relative overflow-hidden rounded-[28px] border border-neutral-200 bg-white/95 p-5 shadow-2xl shadow-black/10 backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#FFAE00]/25 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-black/5 blur-2xl" />

        <button
          type="button"
          onClick={closePopup}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-900"
          aria-label="Zatvoriť"
        >
          ×
        </button>

        <div className="relative pr-8">
          <div className="inline-flex rounded-full bg-[#FFAE00]/15 px-3 py-1 text-xs font-extrabold text-neutral-900">
            {tip.badge}
          </div>

          <h3 className="mt-4 text-xl font-extrabold leading-tight tracking-tight text-neutral-900">
            {tip.title}
          </h3>

          <p className="mt-3 text-sm leading-6 text-neutral-600">
            {tip.text}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={goToConfigurator}
              className="rounded-2xl bg-[#FFAE00] px-4 py-3 text-sm font-extrabold text-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              Začať objednávku
            </button>

            <button
              type="button"
              onClick={closePopup}
              className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-bold text-neutral-700 transition hover:bg-neutral-50"
            >
              Neskôr
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes promoIn {
          from {
            opacity: 0;
            transform: translateY(22px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}