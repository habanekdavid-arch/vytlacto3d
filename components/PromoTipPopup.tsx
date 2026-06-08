"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "vytlacto3d:promo-popup-last-seen";
const SHOW_AFTER_HOURS = 24;
const AUTO_ADVANCE_MS = 6000;

const tips = [
  {
    icon: "🖨️",
    badge: "Vedeli ste, že…",
    title: "FDM tlačiarne stavajú objekt vrstvu po vrstve",
    text: "Každá vrstva má hrúbku 0,1–0,3 mm. Tenšie vrstvy = krajší povrch, ale dlhší čas tlače.",
  },
  {
    icon: "🧱",
    badge: "Tip pre návrh",
    title: "Infill ovplyvňuje pevnosť aj hmotnosť",
    text: "20 % výplň stačí pre väčšinu modelov. Na nosné diely odporúčame 40–50 %.",
  },
  {
    icon: "🌡️",
    badge: "Materiály",
    title: "PLA je najľahšie na tlač, PETG vydrží viac",
    text: "PLA je ideálny na prototypy a dekorácie. PETG zvláda záťaž aj vonkajšie prostredie.",
  },
  {
    icon: "⚡",
    badge: "Rýchlosť",
    title: "Cenu vidíte ešte pred objednávkou",
    text: "Konfigurátor automaticky vypočíta cenu podľa objemu, materiálu, kvality a počtu kusov.",
  },
  {
    icon: "🔩",
    badge: "Vedeli ste, že…",
    title: "3D tlač nahradí aj drahé náhradné diely",
    text: "Lámajúce sa plastové súčiastky, držiaky alebo kryty — vieme ich vytlačiť na mieru.",
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
  const [closing, setClosing] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (shouldShowPopup()) setVisible(true);
    }, 1400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!visible || closing) return;

    setProgress(0);
    const TICK = 50;
    progressRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) return 0;
        return p + (TICK / AUTO_ADVANCE_MS) * 100;
      });
    }, TICK);

    intervalRef.current = setInterval(() => {
      setProgress(0);
      setActiveIdx((i) => (i + 1) % tips.length);
    }, AUTO_ADVANCE_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [visible, closing, activeIdx]);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") doClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible]);

  function doClose() {
    if (closing) return;
    setClosing(true);
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    window.setTimeout(() => {
      setVisible(false);
      setClosing(false);
    }, 350);
  }

  function goToConfigurator() {
    doClose();
    window.setTimeout(() => {
      const target = document.getElementById("kalkulator");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.location.href = "/#kalkulator";
    }, 350);
  }

  function jumpTo(idx: number) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(0);
    setActiveIdx(idx);
  }

  if (!visible) return null;

  const tip = tips[activeIdx];

  return (
    <>
      <div
        className={[
          "fixed bottom-5 right-5 z-[90] w-[calc(100%-40px)] max-w-[360px]",
          closing ? "animate-[promoOut_0.35s_ease-in_forwards]" : "animate-[promoIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_forwards]",
        ].join(" ")}
      >
        {/* Main card */}
        <div className="relative overflow-hidden rounded-[28px] shadow-[0_24px_60px_rgba(0,0,0,0.18)]">

          {/* Header strip */}
          <div className="relative bg-neutral-950 px-5 pt-5 pb-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,174,0,0.25),transparent_60%)]" />

            <div className="relative flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFAE00]/15 text-2xl">
                  {tip.icon}
                </div>
                <span className="rounded-full bg-[#FFAE00]/20 px-3 py-1 text-xs font-extrabold tracking-wide text-[#FFAE00]">
                  {tip.badge}
                </span>
              </div>

              {/* Close button — large, clear */}
              <button
                type="button"
                onClick={doClose}
                aria-label="Zatvoriť"
                className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/60 transition hover:bg-white/20 hover:text-white"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="1" y1="1" x2="13" y2="13" />
                  <line x1="13" y1="1" x2="1" y2="13" />
                </svg>
              </button>
            </div>

            <h3 className="relative mt-4 text-base font-extrabold leading-snug tracking-tight text-white">
              {tip.title}
            </h3>
          </div>

          {/* Body */}
          <div className="bg-white px-5 pt-4 pb-5">
            <p className="text-sm leading-6 text-neutral-600">{tip.text}</p>

            {/* Actions */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goToConfigurator}
                className="rounded-2xl bg-[#FFAE00] px-4 py-2.5 text-sm font-extrabold text-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#FFAE00]/30 active:translate-y-0"
              >
                Vyskúšať konfigurátor
              </button>

              <button
                type="button"
                onClick={doClose}
                className="text-sm font-semibold text-neutral-400 transition hover:text-neutral-700"
              >
                Zavrieť
              </button>
            </div>

            {/* Progress dots + bar */}
            <div className="mt-4 flex items-center gap-2">
              {tips.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => jumpTo(i)}
                  aria-label={`Tip ${i + 1}`}
                  className={[
                    "h-1.5 rounded-full transition-all duration-300",
                    i === activeIdx
                      ? "w-6 bg-[#FFAE00]"
                      : "w-1.5 bg-neutral-200 hover:bg-neutral-300",
                  ].join(" ")}
                />
              ))}
              {/* progress fill for active */}
              <div className="ml-auto text-[10px] font-semibold text-neutral-300">
                {activeIdx + 1}/{tips.length}
              </div>
            </div>

            {/* Thin progress bar */}
            <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full bg-[#FFAE00]/60 transition-none"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes promoIn {
          0%   { opacity: 0; transform: translateY(32px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes promoOut {
          0%   { opacity: 1; transform: translateY(0)    scale(1);    }
          100% { opacity: 0; transform: translateY(20px) scale(0.94); }
        }
      `}</style>
    </>
  );
}
