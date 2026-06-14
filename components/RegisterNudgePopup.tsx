"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const STORAGE_KEY = "vytlacto3d:register-nudge-last-seen";
const SHOW_AFTER_MS = 60_000;
const COOLDOWN_HOURS = 168; // 7 dní

function shouldShow() {
  if (typeof window === "undefined") return false;
  const lastSeen = window.localStorage.getItem(STORAGE_KEY);
  if (!lastSeen) return true;
  const t = Number(lastSeen);
  if (!Number.isFinite(t)) return true;
  return (Date.now() - t) / 3_600_000 >= COOLDOWN_HOURS;
}

function IconUser() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const BENEFITS = [
  "Predvyplnená adresa pri každej objednávke",
  "História všetkých objednávok na jednom mieste",
  "Platba prevodom dostupná len pre registrovaných",
  "Rýchlejší proces — bez opakovaného vypĺňania",
];

export default function RegisterNudgePopup() {
  const { status } = useSession();
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (status === "authenticated") return;
    if (status === "loading") return;
    const t = window.setTimeout(() => {
      if (shouldShow()) setVisible(true);
    }, SHOW_AFTER_MS);
    return () => clearTimeout(t);
  }, [status]);

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

  if (!visible) return null;

  return (
    <>
      <div
        className={[
          "fixed bottom-6 left-6 z-[89] w-[calc(100%-48px)] max-w-[400px]",
          closing
            ? "animate-[nudgeOut_0.35s_ease-in_forwards]"
            : "animate-[nudgeIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_forwards]",
        ].join(" ")}
      >
        <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.13),0_0_0_1px_rgba(0,0,0,0.05)]">

          {/* Header */}
          <div className="bg-neutral-900 px-6 pt-6 pb-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <IconUser />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/40">
                    VytlačTo3D
                  </div>
                  <div className="text-[15px] font-extrabold leading-snug text-white">
                    Zrýchlite si objednávanie
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={doClose}
                aria-label="Zatvoriť"
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7">
                  <line x1="1" y1="1" x2="9" y2="9" />
                  <line x1="9" y1="1" x2="1" y2="9" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 pt-5 pb-6">
            <p className="text-[13px] leading-relaxed text-neutral-500">
              Registrovaní zákazníci majú objednávanie výrazne jednoduchšie:
            </p>

            <ul className="mt-3 space-y-2">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-[13px] text-neutral-700">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#FFAE00] text-black">
                    <IconCheck />
                  </span>
                  {b}
                </li>
              ))}
            </ul>

            <div className="mt-5 flex gap-2">
              <Link
                href="/registracia"
                onClick={doClose}
                className="flex-1 rounded-xl bg-[#FFAE00] px-4 py-2.5 text-center text-[13px] font-extrabold text-black transition hover:bg-[#e09d00]"
              >
                Vytvoriť účet
              </Link>
              <Link
                href="/prihlasenie"
                onClick={doClose}
                className="flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-center text-[13px] font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                Prihlásiť sa
              </Link>
            </div>

            <button
              type="button"
              onClick={doClose}
              className="mt-3 w-full text-center text-[12px] text-neutral-400 transition hover:text-neutral-600"
            >
              Pokračovať bez registrácie
            </button>
          </div>

        </div>
      </div>

      <style jsx global>{`
        @keyframes nudgeIn {
          0%   { opacity: 0; transform: translateY(20px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes nudgeOut {
          0%   { opacity: 1; transform: translateY(0)    scale(1);    }
          100% { opacity: 0; transform: translateY(14px) scale(0.96); }
        }
      `}</style>
    </>
  );
}
