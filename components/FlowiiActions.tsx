"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FlowiiCheckButton from "@/components/FlowiiCheckButton";

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
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

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
        <FlowiiCheckButton />
      </div>

      {!configured && (
        <p className="mt-2 text-xs text-neutral-500">
          Vytvorenie zákazky sa sprístupní po nastavení premenných FLOWII_* vo Verceli.
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
    </div>
  );
}
