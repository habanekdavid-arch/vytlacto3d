"use client";

import { useState } from "react";

/** Prieskum faktúr vo FLOWii (len čítanie) — výsledok sa skopíruje a pošle programátorovi. */
export default function FlowiiInvoiceProbe({ orderId }: { orderId: string }) {
  const [invoiceNumber, setInvoiceNumber] = useState("3026033");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState("");
  const [copied, setCopied] = useState(false);

  async function trial() {
    if (!confirm("Skúšobná faktúra: do FLOWii sa pošlú najviac 2 pokusy o vytvorenie faktúry k tejto zákazke. Ak sa niektorý podarí, vznikne skutočná faktúra (ďalšie číslo v rade). Pokračovať?")) return;
    setBusy(true);
    setOut("");
    setCopied(false);
    try {
      const res = await fetch("/api/admin/flowii/invoice-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, confirm: true, serialNr: invoiceNumber }),
      });
      setOut(JSON.stringify(await res.json(), null, 2));
    } catch (e: any) {
      setOut(`Chyba: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  async function run() {
    setBusy(true);
    setOut("");
    setCopied(false);
    try {
      const res = await fetch("/api/admin/flowii/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, invoiceNumber }),
      });
      setOut(JSON.stringify(await res.json(), null, 2));
    } catch (e: any) {
      setOut(`Chyba: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-3 text-xs">
      <div className="font-bold text-neutral-800">Prieskum faktúr vo FLOWii (len čítanie, nič nemení)</div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="text-neutral-600">
          Číslo faktúry:{" "}
          <input
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className="ml-1 w-28 rounded-lg border border-neutral-200 bg-white px-2 py-1"
          />
        </label>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 font-bold text-neutral-800 hover:border-[#FFAE00] disabled:opacity-50"
        >
          {busy ? "Čítam z FLOWii…" : "Preskúmať faktúry"}
        </button>
        <button
          type="button"
          onClick={trial}
          disabled={busy}
          className="rounded-lg border border-red-300 bg-white px-3 py-1.5 font-bold text-red-700 hover:border-red-500 disabled:opacity-50"
        >
          Skúšobná faktúra (vytvorí doklad)
        </button>
        {out && (
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(out).then(() => setCopied(true))}
            className="rounded-lg bg-[#FFAE00] px-3 py-1.5 font-bold text-black"
          >
            {copied ? "Skopírované ✓" : "Kopírovať výsledok"}
          </button>
        )}
      </div>
      {out && <textarea readOnly value={out} className="mt-2 h-64 w-full rounded-lg border border-neutral-200 bg-white p-2 font-mono text-[11px]" />}
    </div>
  );
}
