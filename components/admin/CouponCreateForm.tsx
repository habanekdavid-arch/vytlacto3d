"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Nový kupón: bez e-mailu sa len vygeneruje (na ručné odovzdanie), s e-mailom sa pošle. */
export default function CouponCreateForm() {
  const router = useRouter();
  const [percent, setPercent] = useState(10);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ percent, email: email.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Kupón sa nepodarilo vytvoriť.");
        return;
      }
      setResult(data.sent ? `Kupón ${data.code} bol odoslaný na ${email.trim()}.` : `Nový kupón: ${data.code}`);
      setEmail("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-extrabold text-neutral-900">Nový jednorazový kupón</div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {[5, 10, 20].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPercent(p)}
            className={[
              "rounded-xl border px-4 py-2.5 text-sm font-extrabold transition",
              percent === p ? "border-[#FFAE00] bg-[#FFAE00] text-black" : "border-neutral-200 bg-white text-neutral-700 hover:border-[#FFAE00]",
            ].join(" ")}
          >
            −{p} %
          </button>
        ))}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail zákazníka (nepovinné)"
          className="min-w-[240px] flex-1 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-[#FFAE00]"
        />
        <button disabled={busy} className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50">
          {busy ? "Pracujem…" : email.trim() ? "Vytvoriť a poslať" : "Vytvoriť kód"}
        </button>
      </div>
      {result && <div className="mt-3 rounded-xl bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-800">{result}</div>}
    </form>
  );
}
