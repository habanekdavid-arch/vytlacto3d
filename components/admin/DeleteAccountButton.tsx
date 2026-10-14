"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteAccountButton({ userId, name, email }: { userId: string; name: string; email: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    const ok = window.confirm(
      `Naozaj odstrániť účet ${name} (${email})?\n\n` +
        "Objednávky a faktúry zostanú zachované (pod e-mailom zákazníka), " +
        "príspevky a komentáre v komunite sa zmažú. Túto akciu nejde vrátiť."
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/ucty/${encodeURIComponent(userId)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Účet sa nepodarilo odstrániť.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
    >
      {busy ? "Odstraňujem…" : "Odstrániť účet"}
    </button>
  );
}
