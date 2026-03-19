"use client";

import { useEffect, useState } from "react";

type Props = {
  dimsX: number;
  dimsY: number;
  dimsZ: number;
  volume: number;
  totalWithVat: string;
};

export default function ModelSummaryBar({
  dimsX,
  dimsY,
  dimsZ,
  volume,
  totalWithVat,
}: Props) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    function onScroll() {
      setCompact(window.scrollY > 320);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={[
        "z-40 transition-all duration-300",
        compact
          ? "fixed left-1/2 top-24 w-[min(1100px,calc(100vw-32px))] -translate-x-1/2"
          : "relative",
      ].join(" ")}
    >
      <div
        className={[
          "rounded-3xl border border-neutral-200 bg-white transition-all duration-300",
          compact
            ? "shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-white/95"
            : "shadow-md",
        ].join(" ")}
      >
        <div
          className={[
            "transition-all duration-300",
            compact
              ? "grid grid-cols-[1.1fr_0.8fr_0.9fr] items-center gap-3 px-4 py-3"
              : "flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between p-5",
          ].join(" ")}
        >
          <div className="min-w-0">
            <div
              className={[
                "font-extrabold text-neutral-900 transition-all duration-300",
                compact ? "text-sm" : "text-lg",
              ].join(" ")}
            >
              Analýza modelu
            </div>

            {!compact ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-neutral-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Rozmery
                  </div>
                  <div className="mt-2 text-base font-semibold text-neutral-900">
                    {dimsX.toFixed(1)} × {dimsY.toFixed(1)} × {dimsZ.toFixed(1)} mm
                  </div>
                </div>

                <div className="rounded-2xl bg-neutral-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Objem
                  </div>
                  <div className="mt-2 text-base font-semibold text-neutral-900">
                    {volume.toFixed(2)} cm³
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-1 truncate text-sm font-medium text-neutral-700">
                {dimsX.toFixed(1)} × {dimsY.toFixed(1)} × {dimsZ.toFixed(1)} mm
              </div>
            )}
          </div>

          {compact ? (
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Objem
              </div>
              <div className="mt-1 text-sm font-semibold text-neutral-900">
                {volume.toFixed(2)} cm³
              </div>
            </div>
          ) : null}

          <div className={compact ? "" : "lg:w-[280px]"}>
            <div
              className={[
                "rounded-2xl border border-[#FFAE00]/40 bg-[#FFAE00]/10 transition-all duration-300",
                compact ? "px-4 py-3" : "h-full p-4",
              ].join(" ")}
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Aktuálna cena
              </div>
              <div
                className={[
                  "font-extrabold tracking-tight text-neutral-900 transition-all duration-300",
                  compact ? "mt-1 text-2xl" : "mt-2 text-3xl",
                ].join(" ")}
              >
                {totalWithVat}
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                Cena je uvedená s DPH
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}