"use client";

import { useCallback, useEffect, useState } from "react";

type Row = { status: string; serialNr: string | null; linked: boolean | null; error: string | null; updatedAt: string } | null;

const LABEL: Record<string, string> = {
  RUNNING: "Vytvára sa…",
  DONE: "Vystavená",
  FAILED: "Nevytvorila sa",
  UNKNOWN: "Neisté — skontrolujte FLOWii",
  SKIPPED: "Vystavte ručne",
};

/** Faktúra vo FLOWii k objednávke: stav automatiky a ručné vystavenie. */
export default function FlowiiInvoiceProbe({ orderId }: { orderId: string }) {
  const [row, setRow] = useState<Row>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [checked, setChecked] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/flowii/invoice?orderId=${encodeURIComponent(orderId)}`).catch(() => null);
    const json = await res?.json().catch(() => null);
    setRow(json?.row ?? null);
    setLoaded(true);
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    if (!confirm("Vystaviť faktúru k tejto objednávke vo FLOWii?")) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/flowii/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, confirmUnknown: checked }),
      });
      const json = await res.json();
      setMsg(json?.result?.message ?? json?.error ?? "");
      setRow(json?.row ?? null);
    } catch (e) {
      setMsg(`Chyba: ${(e as Error)?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return null;
  const status = row?.status;
  const canCreate = !row || status === "FAILED" || status === "SKIPPED" || (status === "UNKNOWN" && checked);
  const tone = status === "DONE" && !row?.error ? "border-green-200 bg-green-50" : status ? "border-amber-200 bg-amber-50" : "border-neutral-200 bg-neutral-50";

  return (
    <div className={`mt-4 rounded-2xl border p-3 text-sm ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-bold text-neutral-900">Faktúra vo FLOWii: </span>
          <span className="text-neutral-700">
            {status ? `${LABEL[status] ?? status}${row?.serialNr ? ` — ${row.serialNr}` : ""}` : "zatiaľ nevystavená (vytvára sa automaticky po zaplatení kartou)"}
          </span>
        </div>
        {status !== "DONE" && status !== "RUNNING" && (
          <button
            type="button"
            onClick={create}
            disabled={busy || !canCreate}
            className="rounded-lg bg-[#FFAE00] px-3 py-1.5 text-xs font-bold text-black disabled:opacity-50"
          >
            {busy ? "Vystavujem…" : "Vystaviť faktúru vo FLOWii"}
          </button>
        )}
      </div>
      {row?.error && <div className="mt-1 text-xs text-neutral-700">{row.error}</div>}
      {status === "UNKNOWN" && (
        <label className="mt-2 flex items-center gap-2 text-xs text-neutral-700">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          Skontroloval(a) som FLOWii — faktúra k tejto objednávke tam nie je.
        </label>
      )}
      {msg && <div className="mt-1 text-xs font-semibold text-neutral-800">{msg}</div>}
    </div>
  );
}
