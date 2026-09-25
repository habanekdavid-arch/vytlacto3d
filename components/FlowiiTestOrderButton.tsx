"use client";

import { useState } from "react";

type Result =
  | {
      ok: true;
      partnerId: string;
      partnerReused: boolean;
      orderId: string;
      taskId: string;
      name: string;
      taskName: string;
      orderNumber: string | null;
      note: string | null;
    }
  | { ok: false; error: string };

/** Založí vo FLOWii jednu fiktívnu zákazku (súbor TEST_zmazat_model.stl, partner Ján Testovací). */
export default function FlowiiTestOrderButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    if (
      !confirm(
        "Vytvoriť vo FLOWii jednu TESTOVACIU zákazku?\n\n" +
          "Vznikne: testovací partner (ak ešte nie je), zákazka a úloha pre Dávida a Adama — " +
          'súbor "TEST_zmazat_model.stl", partner "Ján Testovací".\n\nNa webe nevznikne žiadna objednávka ani platba. ' +
          "Existujúce záznamy vo FLOWii sa nemenia. Po kontrole zákazku vo FLOWii zmažte."
      )
    ) {
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/flowii", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test-zakazka" }),
      });
      const d = await res.json().catch(() => ({}));
      setResult(res.ok ? { ok: true, ...d } : { ok: false, error: d.error ?? `Chyba ${res.status}` });
    } catch {
      setResult({ ok: false, error: "Sieťová chyba." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={run} disabled={busy} className={className}>
        {busy ? "Vytváram test…" : "Testovacia zákazka FLOWii"}
      </button>

      {result && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[10vh]"
          onClick={() => setResult(null)}
        >
          <div
            role="dialog"
            aria-label="Testovacia zákazka FLOWii"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-3xl border border-neutral-200 bg-white p-6 text-left text-sm shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className={`font-bold ${result.ok ? "text-green-700" : "text-red-700"}`}>
                {result.ok ? "✓ Testovacia zákazka je vo FLOWii" : "✗ Testovaciu zákazku sa nepodarilo vytvoriť"}
              </div>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="text-xs font-semibold text-neutral-500 hover:text-neutral-800"
              >
                Zavrieť ×
              </button>
            </div>

            {result.ok ? (
              <div className="mt-3 space-y-1 text-neutral-700">
                <div>
                  <span className="font-semibold">Zákazka:</span> {result.name} (ID {result.orderId})
                </div>
                <div>
                  <span className="font-semibold">Detail → objednávka:</span> {result.orderNumber ?? "—"}
                </div>
                <div>
                  <span className="font-semibold">Úloha:</span> {result.taskName} (ID {result.taskId})
                </div>
                <div>
                  <span className="font-semibold">Partner:</span> ID {result.partnerId}
                  {result.partnerReused ? " (použitý existujúci testovací)" : " (nový testovací)"}
                </div>
                {result.note && <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-red-800">{result.note}</p>}
                <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-amber-900">
                  Skontrolujte zákazku vo FLOWii (názov, firma, partner, typ, stav, zodpovedná, dátumy, popis a úlohu)
                  a potom ju vymažte. Testovacieho partnera môžete nechať — ďalší test ho použije znova.
                </p>
              </div>
            ) : (
              <div className="mt-2 break-words text-red-700">{result.error}</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
