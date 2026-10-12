"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FORMATS = [
  { value: "A6 on A4", label: "A6 na A4 (bežná tlačiareň)" },
  { value: "A6 on A6", label: "A6 (tlačiareň štítkov)" },
  { value: "A7 on A4", label: "A7 na A4" },
  { value: "A7 on A7", label: "A7 (tlačiareň štítkov)" },
];

type Shipment = { barcode: string; barcodeText: string; createdAt: string; weightKg: number };

/**
 * Štítok Packeta v detaile objednávky: jedným tlačidlom zaregistruje
 * zásielku v Packete a otvorí PDF štítku. Hotový štítok sa dá stiahnuť znova.
 */
export default function PacketaLabelPanel({
  orderId,
  configured,
  ready,
  shipment,
  defaultWeightKg,
  defaultSize,
}: {
  orderId: string;
  configured: boolean;
  ready: boolean;
  shipment: Shipment | null;
  defaultWeightKg: number;
  defaultSize: { length: number; width: number; height: number };
}) {
  const router = useRouter();
  const [format, setFormat] = useState(FORMATS[0].value);
  const [weightKg, setWeightKg] = useState(String(defaultWeightKg));
  const [size, setSize] = useState({
    length: String(defaultSize.length),
    width: String(defaultSize.width),
    height: String(defaultSize.height),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labelUrl = (f: string) => `/api/admin/orders/${orderId}/packeta/label?format=${encodeURIComponent(f)}`;

  async function createAndPrint() {
    setBusy(true);
    setError(null);
    // Okno otvoríme hneď po kliknutí, inak ho prehliadač po čakaní na API zablokuje.
    const win = window.open("about:blank", "_blank");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/packeta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weightKg: Number(weightKg.replace(",", ".")),
          lengthCm: Number(size.length),
          widthCm: Number(size.width),
          heightCm: Number(size.height),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Zásielku sa nepodarilo vytvoriť.");
      if (win) win.location.href = labelUrl(format);
      router.refresh();
    } catch (e) {
      win?.close();
      setError(e instanceof Error ? e.message : "Zásielku sa nepodarilo vytvoriť.");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#FFAE00]";

  return (
    <div className="mt-4 space-y-4">
      <label className="block max-w-xs">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Formát štítku</span>
        <select value={format} onChange={(e) => setFormat(e.target.value)} className={`mt-1 ${input}`}>
          {FORMATS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </label>

      {shipment ? (
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={labelUrl(format)}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl bg-[#FFAE00] px-5 py-2.5 text-sm font-bold text-black shadow-sm transition hover:opacity-90"
          >
            🖨️ Stiahnuť štítok (PDF)
          </a>
          <a
            href={`https://tracking.packeta.com/sk/?id=${encodeURIComponent(shipment.barcode)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
          >
            Sledovať zásielku
          </a>
        </div>
      ) : (
        <>
          <div className="grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="block">
              <span className="text-xs font-semibold text-neutral-500">Hmotnosť (kg)</span>
              <input value={weightKg} onChange={(e) => setWeightKg(e.target.value)} inputMode="decimal" className={`mt-1 ${input}`} />
            </label>
            {(["length", "width", "height"] as const).map((k) => (
              <label key={k} className="block">
                <span className="text-xs font-semibold text-neutral-500">
                  {k === "length" ? "Dĺžka" : k === "width" ? "Šírka" : "Výška"} (cm)
                </span>
                <input
                  value={size[k]}
                  onChange={(e) => setSize((s) => ({ ...s, [k]: e.target.value }))}
                  inputMode="numeric"
                  className={`mt-1 ${input}`}
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={createAndPrint}
            disabled={!configured || !ready || busy}
            className="rounded-2xl bg-[#FFAE00] px-5 py-2.5 text-sm font-bold text-black shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Vytváram zásielku…" : "📦 Vytvoriť zásielku a štítok Packeta"}
          </button>
          {!configured && (
            <p className="text-xs text-neutral-500">
              Tlačidlo sa sprístupní po nastavení premennej PACKETA_API_PASSWORD vo Verceli.
            </p>
          )}
        </>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}
    </div>
  );
}
