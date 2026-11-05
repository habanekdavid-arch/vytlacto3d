"use client";

import { useT } from "@/lib/i18n/client";

/**
 * Značka VytlačTo3D cez 3D náhľad modelu z chráneného súboru (.v3d).
 * Len v náhľade — model ani cena sa nemenia, klikanie a otáčanie ide ďalej.
 */
export default function ProtectedWatermark() {
  const t = useT();
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-2xl" aria-hidden>
      <div className="absolute -inset-1/2 flex rotate-[-24deg] flex-col justify-center gap-12">
        {Array.from({ length: 9 }).map((_, row) => (
          <div key={row} className="flex justify-center gap-14 whitespace-nowrap" style={{ marginLeft: row % 2 ? 90 : 0 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="select-none text-xl font-black tracking-wide text-black/[0.07] sm:text-2xl">
                VytlačTo3D
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-neutral-900/85 px-3 py-1 text-[11px] font-bold text-white shadow-sm">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        {t("Chránený model VytlačTo3D")}
      </div>
    </div>
  );
}
