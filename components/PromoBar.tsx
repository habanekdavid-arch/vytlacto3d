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
      <span className="rounded-lg bg-white/10 px-2 py-1 font-mono text-lg font-extrabold tabular-nums text-[#FFAE00] sm:px-2.5 sm:text-2xl">
        {left === null ? "––" : value}
      </span>
      <span className="text-xs font-bold text-white/70 sm:text-sm">{label}</span>
    </span>
  );

  return (
    <div className="relative z-[51] bg-neutral-950 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-2.5 px-4 py-3.5 text-center text-base sm:py-4 sm:text-lg">
        <span className="text-[15px] font-extrabold leading-tight [text-wrap:balance] sm:text-lg">
          <span className="mr-2 inline-block rounded-full bg-[#FFAE00] px-2.5 py-0.5 text-base font-black text-black sm:px-3 sm:py-1 sm:text-xl">−{percent} %</span>
          {t("zľava na všetky objednávky do nedele")}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="text-sm font-semibold text-white/70 sm:text-base">{t("končí o")}</span>
          {unit(String(hours), "h")}
          {unit(pad(minutes), "m")}
          {unit(pad(seconds), "s")}
        </span>
        <a
          href="/#kalkulator"
          className="hidden rounded-full bg-[#FFAE00] px-5 py-2 text-sm font-extrabold text-black transition hover:opacity-90 sm:inline-block"
        >
          {t("Vypočítať cenu")} →
        </a>
      </div>
    </div>
  );
}
