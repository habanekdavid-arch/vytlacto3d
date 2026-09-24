"use client";

import { useState } from "react";

type CheckResult = {
  ok: boolean;
  errors: string[];
  companies: { id: string; name: string }[];
  companyId: string | null;
  resolved: Record<string, string>;
  available: Record<string, string[]>;
};

/** Test pripojenia k FLOWii — volá iba čítacie endpointy, nič nevytvára. */
export default function FlowiiCheckButton({
  label = "Otestovať pripojenie (len čítanie)",
  className = "rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-bold text-neutral-900 shadow-sm transition hover:bg-neutral-50 disabled:opacity-50",
}: {
  label?: string;
  className?: string;
}) {
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState<CheckResult | null>(null);

  async function runCheck() {
    setChecking(true);
    setCheck(null);
    try {
      const res = await fetch("/api/admin/flowii");
      const d = await res.json().catch(() => null);
      setCheck(
        res.ok && d
          ? d
          : { ok: false, errors: [d?.error ?? `Chyba ${res.status}`], companies: [], companyId: null, resolved: {}, available: {} }
      );
    } catch {
      setCheck({ ok: false, errors: ["Sieťová chyba."], companies: [], companyId: null, resolved: {}, available: {} });
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      <button type="button" onClick={runCheck} disabled={checking} className={className}>
        {checking ? "Overujem FLOWii…" : label}
      </button>

      {check && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[10vh]"
          onClick={() => setCheck(null)}
        >
        <div
          role="dialog"
          aria-label="Výsledok testu FLOWii"
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl rounded-3xl border border-neutral-200 bg-white p-6 text-left text-sm shadow-2xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div className={`font-bold ${check.ok ? "text-green-700" : "text-red-700"}`}>
              {check.ok ? "✓ FLOWii je pripojené, všetky názvy sa našli." : "✗ FLOWii zatiaľ nefunguje"}
            </div>
            <button
              type="button"
              onClick={() => setCheck(null)}
              className="text-xs font-semibold text-neutral-500 hover:text-neutral-800"
            >
              Zavrieť ×
            </button>
          </div>
          {check.errors.map((e) => (
            <div key={e} className="mt-1 break-words text-red-700">{e}</div>
          ))}
          {check.companies.length > 0 && (
            <div className="mt-2 text-neutral-700">
              Firmy v API: {check.companies.map((c) => `${c.name} (ID ${c.id})`).join(", ")}
              {check.companyId && <> — použije sa ID {check.companyId}</>}
            </div>
          )}
          {Object.entries(check.resolved).map(([k, v]) => (
            <div key={k} className="mt-1 text-neutral-700">
              <span className="font-semibold">{k}:</span> {v}
            </div>
          ))}
          {Object.keys(check.available).length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer font-semibold text-neutral-700">Čo je vo FLOWii k dispozícii</summary>
              {Object.entries(check.available).map(([k, v]) => (
                <div key={k} className="mt-1 break-words text-neutral-600">
                  <span className="font-semibold">{k}:</span> {v.join(", ") || "—"}
                </div>
              ))}
            </details>
          )}
        </div>
        </div>
      )}
    </>
  );
}
