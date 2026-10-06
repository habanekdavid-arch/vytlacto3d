"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Prepínač Zverejnená / Skrytá priamo v zozname CMS — bez otvárania editora.
 * Uloží len stav `published`, ostatné polia ostanú nedotknuté.
 */
export default function PublishToggle({
  endpoint,
  published,
  labels,
  missingImage = false,
}: {
  endpoint: string;
  published: boolean;
  labels: { on: string; off: string };
  /** Realizácia bez fotky sa na webe neukáže ani zverejnená — upozorníme na to. */
  missingImage?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(published);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function toggle() {
    const next = !value;
    setBusy(true);
    setError(false);
    setValue(next);
    try {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
      router.refresh();
    } catch {
      setValue(!next);
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={toggle}
        disabled={busy}
        title={value ? "Kliknutím skryjete z webu" : "Kliknutím zverejníte na webe"}
        className={[
          "group inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 text-xs font-bold transition disabled:opacity-60",
          value ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200",
        ].join(" ")}
      >
        <span
          className={[
            "relative h-4 w-7 rounded-full transition",
            value ? "bg-green-500" : "bg-neutral-300",
          ].join(" ")}
        >
          <span
            className={[
              "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all",
              value ? "left-3.5" : "left-0.5",
            ].join(" ")}
          />
        </span>
        {busy ? "Ukladám…" : value ? labels.on : labels.off}
      </button>
      {error && <span className="text-[11px] font-semibold text-red-600">Nepodarilo sa uložiť</span>}
      {value && missingImage && !error && (
        <span className="text-[11px] font-semibold text-amber-600">Bez fotky sa na webe neukáže</span>
      )}
    </div>
  );
}
