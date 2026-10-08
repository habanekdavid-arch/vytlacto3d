"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CommunityStatus } from "@/lib/komunita";

/** Zmazanie príspevku (autor/admin) a moderovanie (admin). */
export default function PostActions({
  postId,
  status,
  canDelete,
  isAdmin,
  afterDelete = "/komunita",
}: {
  postId: string;
  status: CommunityStatus;
  canDelete: boolean;
  isAdmin: boolean;
  afterDelete?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: CommunityStatus) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/komunita/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("Zmena sa nepodarila.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Naozaj zmazať príspevok aj s komentármi?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/komunita/posts/${postId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      if (afterDelete) router.push(afterDelete);
      router.refresh();
    } catch {
      setError("Príspevok sa nepodarilo zmazať.");
      setBusy(false);
    }
  }

  const btn =
    "rounded-xl border px-3 py-2 text-xs font-bold transition disabled:opacity-50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isAdmin && status !== "PUBLISHED" && (
        <button type="button" disabled={busy} onClick={() => setStatus("PUBLISHED")} className={`${btn} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`}>
          Schváliť a zverejniť
        </button>
      )}
      {isAdmin && status !== "HIDDEN" && (
        <button type="button" disabled={busy} onClick={() => setStatus("HIDDEN")} className={`${btn} border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50`}>
          Skryť
        </button>
      )}
      {canDelete && (
        <button type="button" disabled={busy} onClick={remove} className={`${btn} border-red-200 bg-white text-red-600 hover:bg-red-50`}>
          Zmazať
        </button>
      )}
      {error && <span className="text-xs font-semibold text-red-600">{error}</span>}
    </div>
  );
}
