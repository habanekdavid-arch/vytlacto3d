"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";

type Theme = "halloween" | "default";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Zostávajúci čas do konca akcie; null = ešte nevypočítané (prvé vykreslenie). */
function useCountdown(endsAt: string) {
  const end = Date.parse(endsAt);
  // Čas sa dopočíta až v prehliadači, aby sa server a klient nehádali o sekundy.
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [end]);

  const total = Math.floor((left ?? 0) / 1000);
  return {
    ended: left === 0,
    ready: left !== null,
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/**
 * Akcia z lib/promo: na hlavnej stránke veľký banner (Halloween), na
 * ostatných stránkach úzka lišta v rovnakých farbách. V administrácii nič.
 */
export default function PromoBar({ percent, endsAt, theme }: { percent: number; endsAt: string; theme: Theme }) {
  const pathname = usePathname() ?? "/";
  const c = useCountdown(endsAt);
  if (c.ended || pathname.startsWith("/admin")) return null;
  if (theme === "halloween" && pathname === "/") return <HalloweenBanner percent={percent} c={c} />;
  return <SlimBar percent={percent} c={c} theme={theme} />;
}

type Countdown = ReturnType<typeof useCountdown>;

function SlimBar({ percent, c, theme }: { percent: number; c: Countdown; theme: Theme }) {
  const t = useT();
  const halloween = theme === "halloween";
  const accent = halloween ? "text-orange-400" : "text-[#FFAE00]";
  const badge = halloween ? "bg-orange-500 text-black" : "bg-[#FFAE00] text-black";

  const unit = (value: number, label: string, padded = true) => (
    <span className="inline-flex items-baseline gap-0.5">
      <span className={`rounded-lg bg-white/10 px-2 py-1 font-mono text-lg font-extrabold tabular-nums sm:px-2.5 sm:text-2xl ${accent}`}>
        {c.ready ? (padded ? pad(value) : value) : "––"}
      </span>
      <span className="text-xs font-bold text-white/70 sm:text-sm">{label}</span>
    </span>
  );

  return (
    <div
      className={[
        "relative z-[51] text-white",
        halloween ? "bg-gradient-to-r from-black via-purple-950 to-purple-800" : "bg-neutral-950",
      ].join(" ")}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-2.5 px-4 py-3.5 text-center text-base sm:py-4 sm:text-lg">
        <span className="text-[15px] font-extrabold leading-tight [text-wrap:balance] sm:text-lg">
          <span className={`mr-2 inline-block rounded-full px-2.5 py-0.5 text-base font-black sm:px-3 sm:py-1 sm:text-xl ${badge}`}>
            −{percent} %
          </span>
          {halloween ? `🎃 ${t("Halloweenska zľava na všetky objednávky")}` : t("zľava na všetky objednávky")}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="text-sm font-semibold text-white/70 sm:text-base">{t("končí o")}</span>
          {c.days > 0 && unit(c.days, t("d"), false)}
          {unit(c.hours, "h", c.days > 0)}
          {unit(c.minutes, "m")}
          {unit(c.seconds, "s")}
        </span>
        <a
          href="/#kalkulator"
          className={`hidden rounded-full px-5 py-2 text-sm font-extrabold transition hover:opacity-90 sm:inline-block ${badge}`}
        >
          {t("Vypočítať cenu")} →
        </a>
      </div>
    </div>
  );
}

function HalloweenBanner({ percent, c }: { percent: number; c: Countdown }) {
  const t = useT();

  const box = (value: number, label: string) => (
    <div className="flex min-w-[64px] flex-col items-center rounded-2xl border border-orange-500/30 bg-black/50 px-3 py-2 backdrop-blur sm:min-w-[84px] sm:px-4 sm:py-3">
      <span className="font-mono text-3xl font-black tabular-nums text-orange-400 sm:text-5xl">
        {c.ready ? pad(value) : "––"}
      </span>
      <span className="mt-0.5 text-[11px] font-bold uppercase tracking-widest text-purple-200 sm:text-xs">{label}</span>
    </div>
  );

  return (
    <section className="relative z-[51] overflow-hidden bg-gradient-to-br from-black via-purple-950 to-purple-900 text-white">
      {/* jemná oranžová žiara za percentom */}
      <div className="pointer-events-none absolute -left-24 top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-orange-500/20 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-6 px-5 pb-0 pt-8 sm:px-8 lg:grid-cols-[1fr_1.15fr] lg:gap-8 lg:py-8">
        <div className="relative z-10 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/40 bg-orange-500/15 px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-orange-300 sm:text-sm">
            🎃 {t("Halloweenska akcia")}
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-center gap-x-4 gap-y-1 lg:justify-start">
            <span className="bg-gradient-to-b from-orange-300 to-orange-600 bg-clip-text text-[88px] font-black leading-[0.85] tracking-tight text-transparent drop-shadow-[0_6px_30px_rgba(249,115,22,0.45)] sm:text-[120px]">
              −{percent}&nbsp;%
            </span>
            <span className="pb-2 text-xl font-extrabold leading-tight sm:pb-4 sm:text-3xl">
              {t("na všetky objednávky")}
              <br />
              <span className="text-purple-200">{t("3D tlače")}</span>
            </span>
          </div>

          <p className="mx-auto mt-4 max-w-md text-sm text-purple-100/80 sm:text-base lg:mx-0">
            {t("Zľava sa automaticky odpočíta z ceny v kalkulačke aj v košíku.")}
          </p>

          <div className="mt-5">
            <div className="text-xs font-bold uppercase tracking-widest text-purple-200/80 sm:text-sm">{t("Akcia končí o")}</div>
            <div className="mt-2 flex justify-center gap-2 sm:gap-3 lg:justify-start">
              {box(c.days, t("dní"))}
              {box(c.hours, t("hod"))}
              {box(c.minutes, t("min"))}
              {box(c.seconds, t("sek"))}
            </div>
          </div>

          <a
            href="#kalkulator"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-7 py-4 text-base font-black text-black shadow-[0_10px_30px_rgba(249,115,22,0.4)] transition hover:bg-orange-400 sm:text-lg"
          >
            {t("Vypočítať cenu so zľavou")} →
          </a>
        </div>

        <div
          className="relative -mx-5 h-[220px] sm:-mx-8 sm:h-[300px] lg:mx-0 lg:h-[400px]"
          // Okraje sady nálepiek sa stratia v pozadí, aby nepôsobila ako obdĺžnik.
          style={{
            WebkitMaskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, #000 62%, transparent 100%)",
            maskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, #000 62%, transparent 100%)",
          }}
        >
          <Image
            src="/promo/halloween.webp"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 700px, 100vw"
            className="object-cover object-top lg:object-contain"
          />
        </div>
      </div>
    </section>
  );
}
