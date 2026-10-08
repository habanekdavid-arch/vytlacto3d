"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { COMMUNITY_REACTIONS, type ReactionKey } from "@/lib/komunita";

export default function ReactionBar({
  postId,
  counts: initialCounts,
  mine: initialMine,
  loggedIn,
  loginHref,
}: {
  postId: string;
  counts: Record<string, number>;
  mine: ReactionKey | null;
  loggedIn: boolean;
  loginHref: string;
}) {
  const router = useRouter();
  const [counts, setCounts] = useState(initialCounts);
  const [mine, setMine] = useState(initialMine);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function react(key: ReactionKey) {
    if (busy) return;
    const next = mine === key ? null : key;
    const prev = { counts, mine };

    // Optimisticky — reakcia sa ukáže hneď, pri chybe sa vráti späť.
    const updated = { ...counts };
    if (mine) updated[mine] = Math.max(0, (updated[mine] ?? 0) - 1);
    if (next) updated[next] = (updated[next] ?? 0) + 1;
    setCounts(updated);
    setMine(next);
    setBusy(true);
    setError(null);

    try {
      const res = await fetch(`/api/komunita/posts/${postId}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: next }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Reakciu sa nepodarilo uložiť.");
      router.refresh();
    } catch (e) {
      setCounts(prev.counts);
      setMine(prev.mine);
      setError(e instanceof Error ? e.message : "Reakciu sa nepodarilo uložiť.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {COMMUNITY_REACTIONS.map((r) => {
          const active = mine === r.key;
          const count = counts[r.key] ?? 0;
          const className = [
            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
            active
              ? "border-[#FFAE00] bg-[#FFAE00]/15 text-neutral-900"
              : "border-neutral-200 bg-white text-neutral-700 hover:border-[#FFAE00] hover:bg-[#FFAE00]/5",
          ].join(" ");
          const inner = (
            <>
              <span className="text-base leading-none">{r.emoji}</span>
              <span>{r.label}</span>
              {count > 0 && <span className="text-neutral-500">{count}</span>}
            </>
          );

          return loggedIn ? (
            <button key={r.key} type="button" onClick={() => react(r.key)} aria-pressed={active} className={className}>
              {inner}
            </button>
          ) : (
            <Link key={r.key} href={loginHref} className={className} title="Na reagovanie sa prihlás">
              {inner}
            </Link>
          );
        })}
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}
