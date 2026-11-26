"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useT } from "@/lib/i18n/client";

type Props = {
  dimsX: number;
  dimsY: number;
  dimsZ: number;
  volume: number;
  totalWithVat: string;
};

const POS_KEY = "vytlacto3d:summary-pos";
const CARD_W = 236;

type Pos = { x: number; y: number };

function readPos(): Pos | null {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY) || "null");
    return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? p : null;
  } catch {
    return null;
  }
}

function clamp(p: Pos, h: number): Pos {
  return {
    x: Math.min(Math.max(8, p.x), window.innerWidth - CARD_W - 8),
    y: Math.min(Math.max(72, p.y), window.innerHeight - h - 8),
  };
}

export default function ModelSummaryBar({ dimsX, dimsY, dimsZ, volume, totalWithVat }: Props) {
  const t = useT();
  const [floating, setFloating] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const dims = `${dimsX.toFixed(1)} × ${dimsY.toFixed(1)} × ${dimsZ.toFixed(1)} mm`;

  useEffect(() => {
    function onScroll() {
      // Na mobile a tablete by plávajúca karta zakrývala formulár — len na počítači.
      setFloating(window.scrollY > 320 && window.innerWidth >= 1024);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Uložená pozícia (zákazník si kartu presunul) — načíta sa až po zobrazení.
  useEffect(() => {
    if (!floating) return;
    const saved = readPos();
    if (!saved) return;
    const id = window.requestAnimationFrame(() => setPos(clamp(saved, cardRef.current?.offsetHeight ?? 140)));
    return () => window.cancelAnimationFrame(id);
  }, [floating]);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const r = cardRef.current?.getBoundingClientRect();
    if (!r) return;
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    setPos(clamp({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy }, cardRef.current?.offsetHeight ?? 140));
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    drag.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const r = cardRef.current?.getBoundingClientRect();
    try {
      if (r) localStorage.setItem(POS_KEY, JSON.stringify({ x: Math.round(r.left), y: Math.round(r.top) }));
    } catch {}
  }

  function resetPos() {
    setPos(null);
    try {
      localStorage.removeItem(POS_KEY);
    } catch {}
  }

  return (
    <>
      {/* Pôvodný blok v stránke — ostáva na mieste, aby obsah neposkakoval. */}
      <div className="rounded-3xl border border-neutral-200 bg-white shadow-md">
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-stretch lg:justify-between">
          <div className="min-w-0">
            <div className="text-lg font-extrabold text-neutral-900">{t("Analýza modelu")}</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-neutral-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t("Rozmery")}</div>
                <div className="mt-2 text-base font-semibold text-neutral-900">{dims}</div>
              </div>
              <div className="rounded-2xl bg-neutral-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t("Objem")}</div>
                <div className="mt-2 text-base font-semibold text-neutral-900">{volume.toFixed(2)} cm³</div>
              </div>
            </div>
          </div>
          <div className="lg:w-[280px]">
            <div className="h-full rounded-2xl border border-[#FFAE00]/40 bg-[#FFAE00]/10 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">{t("Aktuálna cena")}</div>
              <div className="mt-2 text-3xl font-extrabold tracking-tight text-neutral-900">{totalWithVat}</div>
              <div className="mt-1 text-xs text-neutral-500">{t("Cena je uvedená s DPH")}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pri rolovaní: malá karta vedľa konfigurátora, dá sa chytiť a presunúť. */}
      {floating && (
        <div
          ref={cardRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={resetPos}
          title={t("Kartu môžete chytiť a presunúť (dvojklik ju vráti na miesto)")}
          className="fixed z-40 cursor-grab touch-none select-none rounded-2xl border border-neutral-200 bg-white/95 p-3 shadow-xl backdrop-blur active:cursor-grabbing"
          style={{ width: CARD_W, ...(pos ? { left: pos.x, top: pos.y } : { right: 20, top: 112 }) }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-extrabold text-neutral-900">{t("Analýza modelu")}</div>
            <span aria-hidden="true" className="text-sm leading-none tracking-tighter text-neutral-400">
              ⠿
            </span>
          </div>
          <div className="mt-1 text-xs text-neutral-600">{dims}</div>
          <div className="text-xs text-neutral-600">
            {t("Objem")}: {volume.toFixed(2)} cm³
          </div>
          <div className="mt-2 rounded-xl border border-[#FFAE00]/40 bg-[#FFAE00]/10 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-600">{t("Aktuálna cena")}</div>
            <div className="text-xl font-extrabold tracking-tight text-neutral-900">{totalWithVat}</div>
            <div className="text-[10px] text-neutral-500">{t("Cena je uvedená s DPH")}</div>
          </div>
        </div>
      )}
    </>
  );
}
