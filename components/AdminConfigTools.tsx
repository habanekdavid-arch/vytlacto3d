"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { CartItem } from "@/lib/types";
import { colorLabel, materialLabel, qualityLabel } from "@/lib/print-options";
import { isMulticolor } from "@/lib/multicolor";

/**
 * Len pre administrátorov: každý model z konfigurátora sa stiahne ako
 * chránený súbor .v3d, ktorý si nesie aj jeho nastavenie (materiál, kvalita,
 * farba / farby častí, výplň, mierka, kusy…). Po nahratí .v3d do
 * konfigurátora sa model vloží rovno s týmto nastavením.
 */

type Row = { id: string; fileName: string; summary: string; state: "pending" | "busy" | "done" | "error"; url?: string; out?: string; error?: string };

const PROTECTABLE = /\.(stl|obj|svg|png|jpe?g|webp)$/i;

function summary(it: CartItem) {
  const c = it.config;
  const color = c.colorFlexible
    ? "farba nezáleží"
    : isMulticolor(c.partColors)
      ? `viacfarebne (${(c.partColors ?? []).map((x) => colorLabel(x)).join(", ")})`
      : colorLabel(c.color);
  return [materialLabel(c.material), qualityLabel(c.quality), color, `výplň ${c.infillPct} %`, `mierka ${c.scalePct} %`, `${c.quantity} ks`].join(" · ");
}

/** Nastavenie, ktoré ide do .v3d (bez URL podkladov a interných príznakov). */
function exportedConfig(it: CartItem) {
  const c = it.config;
  return {
    material: c.material,
    quality: c.quality,
    infillPct: c.infillPct,
    color: c.color,
    quantity: c.quantity,
    scalePct: c.scalePct,
    materialFlexible: Boolean(c.materialFlexible),
    colorFlexible: Boolean(c.colorFlexible),
    ...(isMulticolor(c.partColors) ? { partColors: c.partColors } : {}),
  };
}

export default function AdminConfigTools({ cartItems }: { cartItems: CartItem[] }) {
  const { status } = useSession();
  const [admin, setAdmin] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      setAdmin(false);
      return;
    }
    let alive = true;
    fetch("/api/admin/whoami", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => alive && setAdmin(Boolean(d?.admin)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [status]);

  if (!admin) return null;

  async function exportAll() {
    const list: Row[] = cartItems.map((it) => ({ id: it.id, fileName: it.fileName, summary: summary(it), state: "pending" }));
    setRows(list);
    const update = (id: string, patch: Partial<Row>) => setRows((rs) => rs?.map((r) => (r.id === id ? { ...r, ...patch } : r)) ?? rs);
    for (const it of cartItems) {
      update(it.id, { state: "busy" });
      try {
        // Model položky je vždy súbor, ktorý sa tlačí (aj pri SVG/obrázku už vytiahnuté STL).
        const name = PROTECTABLE.test(it.fileName) ? it.fileName : `${it.fileName}.stl`;
        const res = await fetch("/api/admin/protect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: it.fileKey, fileName: name, config: exportedConfig(it) }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Nepodarilo sa vytvoriť .v3d.");
        update(it.id, { state: "done", url: data.downloadUrl, out: data.fileName });
      } catch (e: any) {
        update(it.id, { state: "error", error: e?.message || "chyba" });
      }
    }
  }

  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-neutral-900 px-2.5 py-1 text-[11px] font-bold text-white">Admin</span>
        <button
          type="button"
          disabled={cartItems.length === 0 || rows?.some((r) => r.state === "busy")}
          onClick={exportAll}
          title={cartItems.length === 0 ? "Košík je prázdny" : "Každý model ako chránený .v3d aj s nastavením"}
          className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold text-neutral-800 transition hover:border-[#FFAE00] disabled:opacity-50"
        >
          🔒 Exportovať konfiguráciu do .v3d
        </button>
        <span className="text-[11px] text-neutral-500">.v3d sa nahrá späť bežne cez „Nahraj STL“ — vloží sa s rovnakým nastavením.</span>
      </div>

      {rows && rows.length > 0 && (
        <ul className="mt-2 divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {rows.map((r, i) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
              <div className="min-w-0">
                <div className="truncate font-semibold text-neutral-900">
                  {i + 1}. {r.fileName}
                </div>
                <div className="text-[11px] text-neutral-500">{r.summary}</div>
                {r.state === "error" && <div className="text-[11px] font-semibold text-red-600">{r.error}</div>}
              </div>
              {r.state === "done" && r.url ? (
                <a href={r.url} download={r.out} className="shrink-0 rounded-lg bg-[#FFAE00] px-3 py-1.5 text-xs font-bold text-black hover:opacity-90">
                  ⬇ {r.out}
                </a>
              ) : (
                <span className="shrink-0 text-[11px] text-neutral-400">
                  {r.state === "busy" ? "Zamykám…" : r.state === "pending" ? "Čaká…" : ""}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
