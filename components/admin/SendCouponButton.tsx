"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const PERCENTS = [5, 10, 20] as const;

/** Vygeneruje jednorazový kupón a pošle ho klientovi e-mailom. */
export default function SendCouponButton({ email, name }: { email: string; name?: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  async function send(percent: number) {
    if (!window.confirm(`Poslať jednorazový kupón −${percent} % na ${email}?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name && name !== "—" ? name : null, percent }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Kupón sa nepodarilo poslať.");
        return;
      }
      setSent(`${data.code} (−${percent} %)`);
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (sent) return <span className="text-xs font-semibold text-green-700">Odoslané: {sent}</span>;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-[#FFAE00] bg-[#FFAE00]/10 px-3 py-1.5 text-xs font-semibold text-neutral-900 transition hover:bg-[#FFAE00]/25"
      >
        Poslať kupón
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      {PERCENTS.map((p) => (
        <button
          key={p}
          type="button"
          disabled={busy}
          onClick={() => send(p)}
          className="rounded-lg bg-[#FFAE00] px-2.5 py-1.5 text-xs font-extrabold text-black hover:opacity-90 disabled:opacity-50"
        >
          {p} %
        </button>
      ))}
      <button type="button" onClick={() => setOpen(false)} className="px-1.5 text-xs text-neutral-500 hover:text-neutral-800" aria-label="Zrušiť">
        ✕
      </button>
    </div>
  );
}
