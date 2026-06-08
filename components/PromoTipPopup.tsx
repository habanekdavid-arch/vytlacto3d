"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "vytlacto3d:promo-popup-last-seen";
const SHOW_AFTER_HOURS = 24;
const AUTO_ADVANCE_MS = 9000;

const tips = [
  {
    icon: "🖨️",
    badge: "Vedeli ste, že…",
    title: "FDM tlačiarne stavajú objekt vrstvu po vrstve",
    text: "Každá vrstva má hrúbku 0,1–0,3 mm. Tenšie vrstvy znamenajú krajší povrch, ale dlhší čas tlače.",
  },
  {
    icon: "🧱",
    badge: "Tip pre návrh",
    title: "Infill ovplyvňuje pevnosť aj hmotnosť modelu",
    text: "20 % výplň stačí pre väčšinu modelov. Na nosné diely odporúčame 40–50 % pre maximálnu pevnosť.",
  },
  {
    icon: "🌡️",
    badge: "Materiály",
    title: "PLA je najľahšie na tlač, PETG vydrží viac",
    text: "PLA je ideálny na prototypy a dekorácie. PETG zvláda vyššiu záťaž aj vonkajšie prostredie.",
  },
  {
    icon: "⚡",
    badge: "Kalkulácia",
    title: "Cenu vidíte ešte pred odoslaním objednávky",
    text: "Konfigurátor automaticky vypočíta cenu podľa objemu, materiálu, kvality a počtu kusov.",
  },
  {
    icon: "🔩",
    badge: "Vedeli ste, že…",
    title: "3D tlač nahradí aj drahé náhradné diely",
    text: "Lámajúce sa plastové súčiastky, držiaky alebo kryty — vieme ich vytlačiť presne na mieru.",
  },
];

function shouldShowPopup() {
  if (typeof window === "undefined") return false;
  const lastSeen = window.localStorage.getItem(STORAGE_KEY);
  if (!lastSeen) return true;
  const t = Number(lastSeen);
  if (!Number.isFinite(t)) return true;
  return (Date.now() - t) / 3_600_000 >= SHOW_AFTER_HOURS;
}

export default function PromoTipPopup() {
  const [visible, setVisible]   = useState(false);
  const [closing, setClosing]   = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const tickRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  /* — initial show — */
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (shouldShowPopup()) setVisible(true);
    }, 1400);
    return () => clearTimeout(t);
  }, []);

  /* — progress bar + auto-advance — */
  useEffect(() => {
    if (!visible || closing) return;
    setProgress(0);

    const TICK = 50;
    tickRef.current = setInterval(() => {
      setProgress((p) => Math.min(100, p + (TICK / AUTO_ADVANCE_MS) * 100));
    }, TICK);

    advanceRef.current = setInterval(() => {
      setProgress(0);
      setActiveIdx((i) => (i + 1) % tips.length);
    }, AUTO_ADVANCE_MS);

    return () => {
      if (tickRef.current)    clearInterval(tickRef.current);
      if (advanceRef.current) clearInterval(advanceRef.current);
    };
  }, [visible, closing, activeIdx]);

  /* — ESC to close — */
  useEffect(() => {
    if (!visible) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") doClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [visible]);

  function doClose() {
    if (closing) return;
    setClosing(true);
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    window.setTimeout(() => { setVisible(false); setClosing(false); }, 380);
  }

  function goToConfigurator() {
    doClose();
    window.setTimeout(() => {
      const el = document.getElementById("kalkulator");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.location.href = "/#kalkulator";
    }, 380);
  }

  function jumpTo(idx: number) {
    if (tickRef.current)    clearInterval(tickRef.current);
    if (advanceRef.current) clearInterval(advanceRef.current);
    setProgress(0);
    setActiveIdx(idx);
  }

  if (!visible) return null;

  const tip = tips[activeIdx];

  return (
    <>
      <div
        className={[
          "fixed bottom-6 right-6 z-[90] w-[calc(100%-48px)] max-w-[440px]",
          closing
            ? "animate-[promoOut_0.38s_ease-in_forwards]"
            : "animate-[promoIn_0.55s_cubic-bezier(0.34,1.56,0.64,1)_forwards]",
        ].join(" ")}
      >
        <div className="overflow-hidden rounded-[32px] bg-white shadow-[0_32px_80px_rgba(0,0,0,0.14),0_0_0_1px_rgba(0,0,0,0.04)]">

          {/* ── Yellow header ── */}
          <div className="relative bg-[#FFAE00] px-6 pt-6 pb-5">

            {/* subtle radial shine */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_10%_0%,rgba(255,255,255,0.35),transparent)]" />

            <div className="relative flex items-start justify-between gap-4">
              {/* icon + badge */}
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black/10 text-[22px] leading-none">
                  {tip.icon}
                </div>
                <span className="rounded-full bg-black/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-black/70">
                  {tip.badge}
                </span>
              </div>

              {/* close */}
              <button
                type="button"
                onClick={doClose}
                aria-label="Zatvoriť"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/10 text-black/50 transition hover:bg-black/20 hover:text-black active:scale-95"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="1" y1="1" x2="11" y2="11" />
                  <line x1="11" y1="1" x2="1" y2="11" />
                </svg>
              </button>
            </div>

            <h3 className="relative mt-4 text-[17px] font-extrabold leading-snug tracking-tight text-black">
              {tip.title}
            </h3>
          </div>

          {/* ── White body ── */}
          <div className="px-6 pt-5 pb-6">
            <p className="text-[14px] leading-[1.7] text-neutral-500">
              {tip.text}
            </p>

            {/* CTA */}
            <div className="mt-5 flex items-center gap-4">
              <button
                type="button"
                onClick={goToConfigurator}
                className="rounded-2xl bg-[#FFAE00] px-5 py-3 text-[13px] font-extrabold text-black transition hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(255,174,0,0.45)] active:translate-y-0"
              >
                Vyskúšať konfigurátor →
              </button>
              <button
                type="button"
                onClick={doClose}
                className="text-[13px] font-semibold text-neutral-400 transition hover:text-neutral-600"
              >
                Zavrieť
              </button>
            </div>

            {/* dots + counter */}
            <div className="mt-5 flex items-center gap-1.5">
              {tips.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => jumpTo(i)}
                  aria-label={`Tip ${i + 1}`}
                  className={[
                    "h-[5px] rounded-full transition-all duration-300",
                    i === activeIdx
                      ? "w-7 bg-[#FFAE00]"
                      : "w-[5px] bg-neutral-200 hover:bg-[#FFAE00]/50",
                  ].join(" ")}
                />
              ))}
              <span className="ml-auto text-[11px] font-semibold tabular-nums text-neutral-300">
                {activeIdx + 1} / {tips.length}
              </span>
            </div>

            {/* progress bar */}
            <div className="mt-2.5 h-[3px] w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-[#FFAE00] transition-none"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes promoIn {
          0%   { opacity: 0; transform: translateY(28px) scale(0.93); }
          100% { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes promoOut {
          0%   { opacity: 1; transform: translateY(0)    scale(1);    }
          100% { opacity: 0; transform: translateY(18px) scale(0.95); }
        }
      `}</style>
    </>
  );
}
