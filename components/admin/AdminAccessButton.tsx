"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminAccessButton({
  email,
  mode,
  hasAccount = false,
}: {
  email: string;
  mode: "remove" | "restore";
  hasAccount?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    const ok = window.confirm(
      mode === "remove"
        ? `Naozaj odstrániť administrátora ${email}?\n\n` +
            "Okamžite stratí prístup do administrácie." +
            (hasAccount
              ? " Jeho účet sa zmaže (objednávky a faktúry zostanú, príspevky v komunite sa zmažú)."
              : "") +
            "\n\nPrístup sa dá neskôr vrátiť, zmazaný účet nie."
        : `Vrátiť ${email} prístup do administrácie?`
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/ucty/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: mode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Nepodarilo sa.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return mode === "remove" ? (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
    >
      {busy ? "Odstraňujem…" : "Odstrániť administrátora"}
    </button>
  ) : (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
    >
      {busy ? "Vraciam…" : "Vrátiť prístup"}
    </button>
  );
}
