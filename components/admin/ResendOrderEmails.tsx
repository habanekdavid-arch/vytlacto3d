"use client";

import { useState } from "react";

/** Znova odošle e-maily k objednávke (potvrdenie zákazníkovi, notifikácia adminom). */
export default function ResendOrderEmails({ orderId, customerEmail, paid }: { orderId: string; customerEmail: string | null; paid: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function send(target: "both" | "customer" | "admin") {
    const who =
      target === "admin" ? "do internej schránky" : target === "customer" ? `zákazníkovi (${customerEmail})` : `zákazníkovi (${customerEmail}) aj do internej schránky`;
    if (!window.confirm(`Odoslať znova e-mail k objednávke ${who}?`)) return;
    setBusy(target);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/resend-order-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, target }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Odoslanie zlyhalo.");
      const parts = [`Odoslané ${data.sent.join(" a ")}.`, ...(data.errors?.length ? [`Nepodarilo sa: ${data.errors.join(" | ")}`] : [])];
      setMsg({ ok: !data.errors?.length, text: parts.join(" ") });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Odoslanie zlyhalo." });
    } finally {
      setBusy(null);
    }
  }

  const btn = "rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-800 transition hover:border-[#FFAE00] disabled:opacity-50";
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {paid && customerEmail && (
          <button type="button" className={btn} disabled={!!busy} onClick={() => send("both")}>
            {busy === "both" ? "Odosielam…" : "✉ Poslať znova obe (zákazník + admin)"}
          </button>
        )}
        {paid && customerEmail && (
          <button type="button" className={btn} disabled={!!busy} onClick={() => send("customer")}>
            {busy === "customer" ? "Odosielam…" : "Len zákazníkovi"}
          </button>
        )}
        <button type="button" className={btn} disabled={!!busy} onClick={() => send("admin")}>
          {busy === "admin" ? "Odosielam…" : "Len do internej schránky"}
        </button>
      </div>
      {!paid && <p className="mt-2 text-xs text-neutral-500">Objednávka nie je zaplatená — potvrdenie zákazníkovi sa neposiela.</p>}
      {msg && <p className={`mt-2 text-xs font-semibold ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
    </div>
  );
}
