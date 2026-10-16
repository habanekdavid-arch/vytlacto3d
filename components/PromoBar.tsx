"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Lišta nad hlavičkou s odpočtom do konca akcie (lib/promo). */
export default function PromoBar({ percent, endsAt }: { percent: number; endsAt: string }) {
  const t = useT();
  const end = Date.parse(endsAt);
  // Čas sa dopočíta až v prehliadači, aby sa server a klient nehádali o sekundy.
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [end]);

  if (left === 0) return null;

  const total = Math.floor((left ?? 0) / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const unit = (value: string, label: string) => (
    <span className="inline-flex items-baseline gap-0.5">
      <span className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-sm font-extrabold tabular-nums text-[#FFAE00] sm:text-base">
        {left === null ? "––" : value}
      </span>
      <span className="text-[11px] font-semibold text-white/60">{label}</span>
    </span>
  );

  return (
    <div className="relative z-[51] bg-neutral-950 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-4 py-2 text-center text-sm">
        <span className="font-extrabold">
          <span className="mr-1.5 rounded-full bg-[#FFAE00] px-2 py-0.5 text-xs font-extrabold text-black">−{percent} %</span>
          {t("zľava na všetky objednávky do nedele")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="text-xs text-white/60">{t("končí o")}</span>
          {unit(String(hours), "h")}
          {unit(pad(minutes), "m")}
          {unit(pad(seconds), "s")}
        </span>
        <a
          href="/#kalkulator"
          className="hidden rounded-full bg-[#FFAE00] px-3 py-1 text-xs font-extrabold text-black transition hover:opacity-90 sm:inline-block"
        >
          {t("Vypočítať cenu")} →
        </a>
      </div>
    </div>
  );
}
