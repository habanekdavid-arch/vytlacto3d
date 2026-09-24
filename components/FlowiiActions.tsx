"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CheckResult = {
  ok: boolean;
  errors: string[];
  companies: { id: string; name: string }[];
  companyId: string | null;
  resolved: Record<string, string>;
  available: Record<string, string[]>;
};

export default function FlowiiActions({
  orderId,
  configured,
  canCreate,
  syncStatus,
}: {
  orderId: string;
  configured: boolean;
  canCreate: boolean;
  syncStatus: string | null;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function runCheck() {
    setChecking(true);
    setCheck(null);
    try {
      const res = await fetch("/api/admin/flowii");
      setCheck(await res.json());
    } catch {
      setCheck({ ok: false, errors: ["Sieťová chyba."], companies: [], companyId: null, resolved: {}, available: {} });
    } finally {
      setChecking(false);
    }
  }

  async function create() {
    if (!confirm("Vytvoriť zákazku (a úlohu) vo FLOWii pre túto objednávku?\n\nExistujúce záznamy vo FLOWii sa nemenia.")) return;
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/flowii", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ ok: false, text: d.error ?? "Prenos zlyhal." });
      } else if (d.status === "DONE" || d.status === "ALREADY_DONE") {
        setMessage({ ok: true, text: d.status === "DONE" ? "Zákazka bola vytvorená." : "Zákazka už existuje." });
      } else if (d.status === "IN_PROGRESS") {
        setMessage({ ok: false, text: "Prenos práve prebieha — skúste o chvíľu obnoviť stránku." });
      } else {
        setMessage({ ok: false, text: d.reason ?? "Preskočené." });
      }
      router.refresh();
    } catch {
      setMessage({ ok: false, text: "Sieťová chyba." });
    } finally {
      setCreating(false);
    }
  }

  const done = syncStatus === "DONE";

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={runCheck}
          disabled={!configured || checking}
          className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-bold text-neutral-900 shadow-sm transition hover:bg-neutral-50 disabled:opacity-50"
        >
          {checking ? "Overujem…" : "Otestovať pripojenie (len čítanie)"}
        </button>
        {!done && (
          <button
            type="button"
            onClick={create}
            disabled={!configured || !canCreate || creating}
            className="rounded-2xl bg-[#FFAE00] px-4 py-2 text-sm font-bold text-black shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {creating ? "Vytváram…" : syncStatus === "FAILED" ? "Skúsiť znova vytvoriť zákazku" : "Vytvoriť zákazku vo FLOWii"}
          </button>
        )}
      </div>

      {!configured && (
        <p className="mt-2 text-xs text-neutral-500">
          Tlačidlá sa sprístupnia po nastavení premenných FLOWII_* vo Verceli.
        </p>
      )}

      {message && (
        <div
          className={`mt-3 rounded-2xl px-4 py-3 text-sm ${
            message.ok ? "border border-green-200 bg-green-50 text-green-800" : "border border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {check && (
        <div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
          <div className={`font-bold ${check.ok ? "text-green-700" : "text-red-700"}`}>
            {check.ok ? "✓ Pripojenie funguje, všetky názvy sa našli." : "✗ Niečo nesedí"}
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
      )}
    </div>
  );
}
