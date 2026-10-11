"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/client";

export default function ResumeOrderButton({ orderId }: { orderId: string }) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleResume() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/resume-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("Chyba pri načítaní platby."));
        return;
      }
      window.location.href = data.url;
    } catch {
      setError(t("Nepodarilo sa načítať platbu."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        onClick={handleResume}
        disabled={loading}
        className="rounded-xl bg-[#FFAE00] px-4 py-2 text-sm font-semibold text-black shadow-sm transition hover:bg-[#e09d00] disabled:opacity-60"
      >
        {loading ? t("Načítavam...") : t("Dokončiť platbu →")}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
