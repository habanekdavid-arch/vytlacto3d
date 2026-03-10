"use client";

import { useEffect, useMemo, useState } from "react";
import ColorPalette, { COLOR_LABELS } from "@/components/ColorPalette";

type Analysis = { volumeCm3: number };

type Quote = {
  gramsPerPart: number;
  printTimeMinPerPart: number;
  materialCostPerPart: number;
  machineCostPerPart: number;
  subtotalPerPart: number;
  total: number;
};

export type ConfigState = {
  material: "PLA" | "PETG" | "ABS" | "TPU";
  quality: "DRAFT" | "STANDARD" | "FINE";
  infillPct: number; // 5–70
  color: string;
  quantity: number;
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
  });

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);

  const payload = useMemo(() => {
    return { volumeCm3: analysis.volumeCm3, ...config };
  }, [analysis.volumeCm3, config]);

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
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [payload, onQuote]); // ✅ bez config v dependencies (inak loop)

  const infillChips = [10, 20, 35, 50, 70];

  return (
    <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-zinc-500">Konfigurátor</div>
          <div className="text-2xl font-semibold text-zinc-900">
            Nastav parametre tlače
          </div>
          <div className="mt-1 text-sm text-zinc-500">
            Vyklikaj materiál, kvalitu, pevnosť (infill), farbu a počet kusov.
            Cena sa prepočíta automaticky.
          </div>
        </div>

        <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600">
          {loading ? "počítam…" : "aktuálne"}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Field label="Materiál" hint="Výber materiálu (cena sa ráta automaticky).">
          <select
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
            value={config.material}
            onChange={(e) =>
              setConfig((c) => ({ ...c, material: e.target.value as any }))
            }
          >
            <option value="PLA">PLA</option>
            <option value="PETG">PETG</option>
            <option value="ABS">ABS</option>
            <option value="TPU">TPU</option>
          </select>
        </Field>

        <Field label="Kvalita (detail)" hint="Rýchla = hrubšia vrstva. Detailná = krajší povrch.">
          <div className="flex flex-wrap gap-2">
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

          <div className="mt-2 text-xs text-zinc-500">
            Vybraná:{" "}
            <span className="font-medium text-zinc-800">
              {config.quality === "DRAFT"
                ? "Rýchla"
                : config.quality === "STANDARD"
                ? "Štandard"
                : "Detailná"}
            </span>
          </div>
        </Field>

        <Field label="Pevnosť (Infill)" hint="Vyšší infill = pevnejšie, ale viac materiálu a času.">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center justify-between text-xs text-zinc-600">
              <span className="font-medium text-zinc-800">{config.infillPct}%</span>
              <span>5% – 70%</span>
            </div>

            <input
              className="mt-3 w-full accent-[#FFAE00]"
              type="range"
              min={5}
              max={70}
              value={config.infillPct}
              onChange={(e) =>
                setConfig((c) => ({ ...c, infillPct: Number(e.target.value) }))
              }
            />

            <div className="mt-3 flex flex-wrap gap-2">
              {infillChips.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, infillPct: p }))}
                  className={[
                    "rounded-full border px-3 py-1 text-xs",
                    config.infillPct === p
                      ? "border-[#FFAE00] bg-[#FFAE00]/20 text-zinc-900"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                  ].join(" ")}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>
        </Field>

        <Field label="Farba" hint="Farba je len vizuálna (reálne závisí od dostupnosti).">
          <ColorPalette
            value={config.color}
            onChange={(id) => setConfig((c) => ({ ...c, color: id }))}
          />
          <div className="mt-2 text-xs text-zinc-500">
            Vybraná:{" "}
            <span className="font-medium text-zinc-800">
              {COLOR_LABELS[config.color] ?? config.color}
            </span>
          </div>
        </Field>

        <Field label="Počet kusov" hint="Minimálne 1 ks.">
          <input
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
            type="number"
            min={1}
            max={999}
            value={config.quantity}
            onChange={(e) =>
              setConfig((c) => ({ ...c, quantity: Number(e.target.value || 1) }))
            }
          />
        </Field>
      </div>

      <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-zinc-900">Cena</div>
          <div className="text-xs text-zinc-500">{loading ? "počítam…" : "aktuálne"}</div>
        </div>

        {quote ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2 text-sm text-zinc-800">
            <div>
              Odhad materiálu / ks: <b>{quote.gramsPerPart} g</b>
            </div>
            <div>
              Odhad času / ks: <b>{quote.printTimeMinPerPart} min</b>
            </div>
            <div>
              Náklad materiál / ks: <b>{quote.materialCostPerPart} €</b>
            </div>
            <div>
              Náklad čas / ks: <b>{quote.machineCostPerPart} €</b>
            </div>
            <div className="md:col-span-2 mt-2 text-lg text-zinc-900">
              Spolu: <b>{quote.total} €</b>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-sm text-zinc-500">
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
    <label className="block">
      <div className="mb-1 text-xs font-medium text-zinc-800">{label}</div>
      {hint ? <div className="mb-2 text-xs text-zinc-500">{hint}</div> : null}
      {children}
    </label>
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
        "rounded-full border px-4 py-2 text-sm transition",
        active
          ? "border-[#FFAE00] bg-[#FFAE00]/20 text-zinc-900"
          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}