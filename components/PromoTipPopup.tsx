"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "vytlacto3d:promo-popup-last-seen";
const SHOW_AFTER_HOURS = 24;
const AUTO_ADVANCE_MS = 9000;

function IconPrinter() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function IconFlame() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function IconZap() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconWrench() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

const tips = [
  {
    Icon: IconPrinter,
    badge: "Vedeli ste, že…",
    title: "FDM tlačiarne stavajú objekt vrstvu po vrstve",
    text: "Každá vrstva má hrúbku 0,1–0,3 mm. Tenšie vrstvy znamenajú krajší povrch, ale dlhší čas tlače.",
  },
  {
    Icon: IconLayers,
    badge: "Tip pre návrh",
    title: "Infill ovplyvňuje pevnosť aj hmotnosť modelu",
    text: "20 % výplň stačí pre väčšinu modelov. Na nosné diely odporúčame 40–50 % pre maximálnu pevnosť.",
  },
  {
    Icon: IconFlame,
    badge: "Materiály",
    title: "PLA je najľahšie na tlač, PETG vydrží viac",
    text: "PLA je ideálny na prototypy a dekorácie. PETG zvláda vyššiu záťaž aj vonkajšie prostredie.",
  },
  {
    Icon: IconZap,
    badge: "Kalkulácia",
    title: "Cenu vidíte ešte pred odoslaním objednávky",
    text: "Konfigurátor automaticky vypočíta cenu podľa objemu, materiálu, kvality a počtu kusov.",
  },
  {
    Icon: IconWrench,
    badge: "Na mieru",
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
  const [visible,   setVisible]   = useState(false);
  const [closing,   setClosing]   = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [progress,  setProgress]  = useState(0);
  const tickRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    window.setTimeout(() => { setVisible(false); setClosing(false); }, 350);
  }

  function goToConfigurator() {
    doClose();
    window.setTimeout(() => {
      const el = document.getElementById("kalkulator");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.location.href = "/#kalkulator";
    }, 350);
  }

  function jumpTo(idx: number) {
    if (tickRef.current)    clearInterval(tickRef.current);
    if (advanceRef.current) clearInterval(advanceRef.current);
    setProgress(0);
    setActiveIdx(idx);
  }

  if (!visible) return null;

  const { Icon, badge, title, text } = tips[activeIdx];

  return (
    <>
      <div
        className={[
          "fixed bottom-6 right-6 z-[90] w-[calc(100%-48px)] max-w-[420px]",
          closing
            ? "animate-[promoOut_0.35s_ease-in_forwards]"
            : "animate-[promoIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_forwards]",
        ].join(" ")}
      >
        <div className="overflow-hidden rounded-[30px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.05)]">

          {/* ── Yellow header ── */}
          <div className="bg-[#FFAE00] px-7 pt-7 pb-6">
            <div className="flex items-start justify-between">

              {/* icon + badge */}
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black/[0.12]">
                  <Icon />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-black/50">
                  {badge}
                </span>
              </div>

              {/* close */}
              <button
                type="button"
                onClick={doClose}
                aria-label="Zatvoriť"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.10] transition hover:bg-black/[0.18] active:scale-95"
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.55">
                  <line x1="1" y1="1" x2="10" y2="10" />
                  <line x1="10" y1="1" x2="1"  y2="10" />
                </svg>
              </button>
            </div>

            <h3 className="mt-5 text-[17px] font-extrabold leading-snug tracking-[-0.01em] text-black">
              {title}
            </h3>
          </div>

          {/* ── White body ── */}
          <div className="px-7 pt-6 pb-7">
            <p className="text-[14px] leading-[1.75] text-neutral-400">
              {text}
            </p>

            {/* actions */}
            <div className="mt-6 flex items-center gap-5">
              <button
                type="button"
                onClick={goToConfigurator}
                className="rounded-2xl bg-[#FFAE00] px-5 py-3 text-[13px] font-extrabold text-black transition hover:opacity-90 active:scale-[0.98]"
              >
                Vyskúšať konfigurátor
              </button>
              <button
                type="button"
                onClick={doClose}
                className="text-[13px] font-medium text-neutral-400 transition hover:text-neutral-700"
              >
                Zavrieť
              </button>
            </div>

            {/* dot nav + counter */}
            <div className="mt-6 flex items-center gap-2">
              {tips.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => jumpTo(i)}
                  aria-label={`Tip ${i + 1}`}
                  className={[
                    "h-[4px] rounded-full transition-all duration-300",
                    i === activeIdx
                      ? "w-6 bg-[#FFAE00]"
                      : "w-[4px] bg-neutral-200 hover:bg-[#FFAE00]/40",
                  ].join(" ")}
                />
              ))}
              <span className="ml-auto text-[11px] tabular-nums text-neutral-300">
                {activeIdx + 1}&thinsp;/&thinsp;{tips.length}
              </span>
            </div>

            {/* progress bar */}
            <div className="mt-3 h-[2px] w-full overflow-hidden rounded-full bg-neutral-100">
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
          0%   { opacity: 0; transform: translateY(24px) scale(0.94); }
          100% { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes promoOut {
          0%   { opacity: 1; transform: translateY(0)    scale(1);    }
          100% { opacity: 0; transform: translateY(16px) scale(0.96); }
        }
      `}</style>
    </>
  );
}
