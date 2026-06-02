"use client";

import { useEffect, useMemo, useState } from "react";
import ColorPalette, { COLOR_LABELS } from "@/components/ColorPalette";
import { formatPriceWithVat } from "@/lib/vat";

type Analysis = { volumeCm3: number };

type Quote = {
  gramsPerPart: number;
  printTimeMinPerPart: number;
  materialCostPerPart: number;
  machineCostPerPart: number;
  subtotalPerPart: number;
  setupFee: number;
  productionSubtotal: number;
  quantityDiscountPct: number;
  quantityDiscountAmount: number;
  total: number;
};

export type ConfigState = {
  material: "PLA" | "PETG" | "ABS" | "TPU";
  quality: "DRAFT" | "STANDARD" | "FINE";
  infillPct: number;
  color: string;
  quantity: number;
  scalePct: number;
};

export default function Configurator({
  analysis,
  onQuote,
}: {
  analysis: Analysis;
  onQuote: (q: Quote, config: ConfigState) => void;
}) {
  const [config, setConfig] = useState<ConfigState>({
    material: "PLA",
    quality: "STANDARD",
    infillPct: 20,
    color: "black",
    quantity: 1,
    scalePct: 100,
  });

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);

  const scaledVolumeCm3 = useMemo(() => {
    const scaleFactor = config.scalePct / 100;
    return analysis.volumeCm3 * Math.pow(scaleFactor, 3);
  }, [analysis.volumeCm3, config.scalePct]);

  const payload = useMemo(
    () => ({
      volumeCm3: scaledVolumeCm3,
      material: config.material,
      quality: config.quality,
      infillPct: config.infillPct,
      color: config.color,
      quantity: config.quantity,
      scalePct: config.scalePct,
    }),
    [scaledVolumeCm3, config]
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);

    fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => r.text().then((t) => ({ ok: r.ok, t })))
      .then(({ ok, t }) => {
        if (!alive) return;

        let j: any = null;

        try {
          j = JSON.parse(t);
        } catch {
          j = { error: t };
        }

        if (!ok) throw new Error(j.error || "Quote error");

        setQuote(j);
        onQuote(j, config);
      })
      .catch(() => {
        if (!alive) return;
        setQuote(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [payload, onQuote, config]);

  const infillChips = [10, 20, 35, 50];
  const scaleChips = [50, 75, 100, 125, 150, 200];

  return (
    <div className="mt-6 rounded-[32px] bg-white p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FFAE00]/15 px-3 py-1 text-xs font-bold text-neutral-800">
            <span className="h-2 w-2 rounded-full bg-[#FFAE00]" />
            Online výpočet ceny
          </div>

          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-neutral-900">
            Nastav parametre tlače
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            Vyber materiál, kvalitu, veľkosť modelu, výplň, farbu a počet kusov.
            Cena sa automaticky prepočíta vrátane DPH.
          </p>
        </div>

        <div className="rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-semibold text-neutral-600">
          {loading ? "počítam cenu…" : "cena aktuálna"}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Field label="Materiál" hint="Výber materiálu pre konkrétne použitie.">
          <select
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#FFAE00]"
            value={config.material}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                material: e.target.value as ConfigState["material"],
              }))
            }
          >
            <option value="PLA">PLA</option>
            <option value="PETG">PETG</option>
            <option value="ABS">ABS</option>
            <option value="TPU">TPU</option>
          </select>
        </Field>

        <Field label="Kvalita tlače" hint="Vyššia kvalita = krajší povrch.">
          <div className="grid grid-cols-3 gap-2">
            <Seg
              active={config.quality === "DRAFT"}
              onClick={() => setConfig((c) => ({ ...c, quality: "DRAFT" }))}
            >
              Rýchla
            </Seg>
            <Seg
              active={config.quality === "STANDARD"}
              onClick={() => setConfig((c) => ({ ...c, quality: "STANDARD" }))}
            >
              Štandard
            </Seg>
            <Seg
              active={config.quality === "FINE"}
              onClick={() => setConfig((c) => ({ ...c, quality: "FINE" }))}
            >
              Detailná
            </Seg>
          </div>
        </Field>

        <Field label="Počet kusov" hint="Pri väčšom množstve sa ráta zľava.">
          <input
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#FFAE00]"
            type="number"
            min={1}
            max={999}
            value={config.quantity}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                quantity: Math.max(1, Number(e.target.value || 1)),
              }))
            }
          />
        </Field>

        <Field label="Veľkosť modelu" hint="100 % = pôvodná veľkosť modelu.">
          <SliderBox
            value={config.scalePct}
            min={10}
            max={200}
            suffix="%"
            chips={scaleChips}
            onChange={(value) =>
              setConfig((c) => ({ ...c, scalePct: value }))
            }
          />
        </Field>

        <Field label="Výplň modelu" hint="Maximum je 50 %. Vyššia výplň = vyššia pevnosť.">
          <SliderBox
            value={config.infillPct}
            min={5}
            max={50}
            suffix="%"
            chips={infillChips}
            onChange={(value) =>
              setConfig((c) => ({ ...c, infillPct: value }))
            }
          />
        </Field>

        <Field label="Farba" hint="Reálna dostupnosť závisí od skladových zásob.">
          <ColorPalette
            value={config.color}
            onChange={(id) => setConfig((c) => ({ ...c, color: id }))}
          />

          <div className="mt-3 rounded-2xl bg-neutral-50 px-4 py-3 text-xs text-neutral-600">
            Vybraná farba:{" "}
            <span className="font-bold text-neutral-900">
              {COLOR_LABELS[config.color] ?? config.color}
            </span>
          </div>
        </Field>
      </div>

      <div className="mt-6 rounded-[28px] bg-neutral-950 p-5 text-white shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white/60">
              Finálna cena
            </div>
            <div className="mt-1 text-3xl font-extrabold tracking-tight">
              {quote ? formatPriceWithVat(quote.total) : "—"}
            </div>
            <div className="mt-1 text-xs text-white/50">
              Cena je uvedená vrátane DPH.
            </div>
          </div>

          <div className="rounded-2xl bg-[#FFAE00] px-4 py-3 text-sm font-extrabold text-black">
            {loading ? "Prepočítavam…" : "Aktuálne"}
          </div>
        </div>

        {quote ? (
          <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
            <PriceLine label="Materiál / ks" value={`${quote.gramsPerPart} g`} />
            <PriceLine
              label="Čas tlače / ks"
              value={`${quote.printTimeMinPerPart} min`}
            />
            <PriceLine
              label="Cena materiálu / ks"
              value={formatPriceWithVat(quote.materialCostPerPart)}
            />
            <PriceLine
              label="Cena stroja / ks"
              value={formatPriceWithVat(quote.machineCostPerPart)}
            />
            <PriceLine
              label="Výroba spolu"
              value={formatPriceWithVat(quote.productionSubtotal)}
            />
            <PriceLine
              label="Základ za model"
              value={formatPriceWithVat(quote.setupFee)}
            />
            <PriceLine label="Mierka" value={`${config.scalePct}%`} />
            <PriceLine
              label="Množstevná zľava"
              value={
                quote.quantityDiscountPct > 0
                  ? `-${quote.quantityDiscountPct}%`
                  : "bez zľavy"
              }
            />
          </div>
        ) : (
          <div className="mt-5 text-sm text-white/60">
            Nepodarilo sa vypočítať cenu.
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group rounded-[26px] border border-neutral-200 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#FFAE00]/50 hover:shadow-xl hover:shadow-[#FFAE00]/10">
      <div className="text-sm font-extrabold text-neutral-900">{label}</div>
      {hint ? (
        <div className="mt-1 min-h-[36px] text-xs leading-5 text-neutral-500">
          {hint}
        </div>
      ) : null}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Seg({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-2xl border px-3 py-3 text-xs font-bold transition duration-300",
        active
          ? "border-[#FFAE00] bg-[#FFAE00] text-black shadow-md shadow-[#FFAE00]/20"
          : "border-neutral-200 bg-white text-neutral-700 hover:-translate-y-0.5 hover:bg-neutral-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SliderBox({
  value,
  min,
  max,
  suffix,
  chips,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  suffix: string;
  chips: number[];
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-4">
      <div className="flex items-center justify-between text-xs text-neutral-600">
        <span className="text-lg font-extrabold text-neutral-900">
          {value}
          {suffix}
        </span>
        <span>
          {min}
          {suffix} – {max}
          {suffix}
        </span>
      </div>

      <input
        className="mt-4 w-full accent-[#FFAE00]"
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onChange(chip)}
            className={[
              "rounded-full border px-3 py-1.5 text-xs font-bold transition",
              value === chip
                ? "border-[#FFAE00] bg-[#FFAE00] text-black"
                : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100",
            ].join(" ")}
          >
            {chip}
            {suffix}
          </button>
        ))}
      </div>
    </div>
  );
}

function PriceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
      <span className="text-white/60">{label}</span>
      <b>{value}</b>
    </div>
  );
}