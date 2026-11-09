"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { upload } from "@vercel/blob/client";
import type JSZipType from "jszip";
import type { CartItem, CartItemPricing } from "@/lib/types";
import { scaledGeometry } from "@/lib/pricing";
import { colorLabel, materialLabel, qualityLabel } from "@/lib/print-options";
import { isMulticolor, multicolorAllowedFor } from "@/lib/multicolor";
import { addVat } from "@/lib/vat";

/**
 * Len pre administrátorov: export celej konfigurácie z konfigurátora (všetky
 * položky košíka) do ZIP — modely, pôvodné podklady (SVG/obrázok/výkres),
 * manifest.json so všetkými parametrami a tabuľka konfiguracia.csv pre Excel.
 * Rovnaký ZIP sa dá nahrať späť (import) a obnoví položky s rovnakým nastavením.
 */

const FORMAT = "vytlacto3d-konfiguracia";

type ManifestItem = {
  order: number;
  fileName: string;
  fileKey: string;
  fileSize: number;
  modelPath: string | null;
  sourcePath: string | null;
  analysis: CartItem["analysis"];
  config: CartItem["config"];
  pricing: CartItem["pricing"];
};
type Manifest = { format: string; version: number; exportedAt: string; items: ManifestItem[] };

const pad = (n: number) => String(n).padStart(2, "0");
const safe = (name: string) =>
  name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").slice(-100) || "subor";
const baseName = (url: string) => {
  try {
    return decodeURIComponent(new URL(url, location.origin).pathname.split("/").pop() || "podklad");
  } catch {
    return "podklad";
  }
};
/** Kde sa dá model stiahnuť: katalóg (/…), Blob priamo (bez presmerovania), inak cez /api/file. */
const modelUrl = (fileKey: string) =>
  fileKey.startsWith("/") || /^https?:\/\//.test(fileKey) ? fileKey : `/api/file?key=${encodeURIComponent(fileKey)}`;

async function loadZip(): Promise<typeof JSZipType> {
  return (await import("jszip")).default;
}

/** Je súbor na pôvodnej adrese ešte k dispozícii? */
async function reachable(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" }, cache: "no-store" });
    return r.ok;
  } catch {
    return false;
  }
}

function csvTable(items: CartItem[]): string {
  const num = (v: number | undefined, d = 2) => (v === undefined || !Number.isFinite(v) ? "" : v.toFixed(d).replace(".", ","));
  const cell = (v: unknown) => {
    const s = String(v ?? "");
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = [
    "Č.", "Súbor", "Materiál", "Kvalita", "Farba", "Farby častí", "Výplň %", "Mierka %", "Kusy",
    "Rozmery X×Y×Z mm (po mierke)", "Objem cm³ (po mierke)", "Hmotnosť g/ks", "Čas tlače min/ks",
    "Cena/ks bez DPH €", "Spolu bez DPH €", "Spolu s DPH €", "Nezáleží na materiáli", "Nezáleží na farbe", "Model",
  ];
  const rows = items.map((it, i) => {
    const s = (it.config.scalePct || 100) / 100;
    const a = it.analysis;
    const p = it.pricing;
    return [
      i + 1,
      it.fileName,
      materialLabel(it.config.material),
      qualityLabel(it.config.quality),
      it.config.colorFlexible ? "nezáleží" : colorLabel(it.config.color),
      isMulticolor(it.config.partColors) ? (it.config.partColors ?? []).map((c) => colorLabel(c)).join(", ") : "",
      it.config.infillPct,
      it.config.scalePct,
      it.config.quantity,
      `${num(a.dimsXmm * s, 1)} × ${num(a.dimsYmm * s, 1)} × ${num(a.dimsZmm * s, 1)}`,
      num(a.volumeCm3 * s ** 3),
      num(p?.gramsPerPart, 1),
      num(p?.printTimeMinPerPart, 0),
      num(p?.subtotalPerPart),
      num(p?.total),
      p ? num(addVat(p.total)) : "",
      it.config.materialFlexible ? "áno" : "nie",
      it.config.colorFlexible ? "áno" : "nie",
      it.fileKey.startsWith("/") ? `katalóg: ${it.fileKey}` : "",
    ].map(cell).join(";");
  });
  return "﻿" + [head.map(cell).join(";"), ...rows].join("\r\n") + "\r\n";
}

async function quoteFor(item: CartItem): Promise<CartItemPricing | null> {
  const g = scaledGeometry(item.analysis, item.config.scalePct);
  try {
    const r = await fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...g,
        material: item.config.material,
        quality: item.config.quality,
        infillPct: item.config.infillPct,
        color: item.config.color,
        quantity: item.config.quantity,
        scalePct: item.config.scalePct,
        materialFlexible: item.config.materialFlexible,
        colorFlexible: item.config.colorFlexible,
        multicolor: isMulticolor(item.config.partColors) && multicolorAllowedFor(item.config.material),
        fileKey: item.fileKey,
      }),
    });
    return r.ok ? ((await r.json()) as CartItemPricing) : null;
  } catch {
    return null;
  }
}

export default function AdminConfigTools({
  cartItems,
  onImport,
}: {
  cartItems: CartItem[];
  onImport: (items: CartItem[], replace: boolean) => void;
}) {
  const { status } = useSession();
  const [admin, setAdmin] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  async function exportZip() {
    setMsg(null);
    setBusy("Pripravujem export…");
    try {
      const JSZip = await loadZip();
      const zip = new JSZip();
      const items: ManifestItem[] = [];
      const missing: string[] = [];
      for (let i = 0; i < cartItems.length; i++) {
        const it = cartItems[i];
        const nn = pad(i + 1);
        setBusy(`Sťahujem model ${i + 1}/${cartItems.length}…`);
        let modelPath: string | null = `modely/${nn}_${safe(it.fileName)}`;
        try {
          const r = await fetch(modelUrl(it.fileKey));
          if (!r.ok) throw new Error(String(r.status));
          zip.file(modelPath, await r.arrayBuffer());
        } catch {
          modelPath = null;
          missing.push(it.fileName);
        }
        let sourcePath: string | null = null;
        if (it.config.sourceDrawingUrl) {
          try {
            const r = await fetch(it.config.sourceDrawingUrl);
            if (r.ok) {
              sourcePath = `podklady/${nn}_${safe(baseName(it.config.sourceDrawingUrl))}`;
              zip.file(sourcePath, await r.arrayBuffer());
            }
          } catch {}
        }
        items.push({
          order: i + 1,
          fileName: it.fileName,
          fileKey: it.fileKey,
          fileSize: it.fileSize,
          modelPath,
          sourcePath,
          analysis: it.analysis,
          config: it.config,
          pricing: it.pricing,
        });
      }
      const manifest: Manifest = { format: FORMAT, version: 1, exportedAt: new Date().toISOString(), items };
      zip.file("manifest.json", JSON.stringify(manifest, null, 2));
      zip.file("konfiguracia.csv", csvTable(cartItems));
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      const d = new Date();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `vytlacto3d-konfiguracia-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      setMsg({
        ok: missing.length === 0,
        text: missing.length
          ? `Exportované, ale bez modelu: ${missing.join(", ")} (súbor už nie je dostupný).`
          : `Exportovaných položiek: ${items.length}.`,
      });
    } catch (e: any) {
      setMsg({ ok: false, text: `Export zlyhal: ${e?.message || e}` });
    } finally {
      setBusy(null);
    }
  }

  async function importZip(file: File) {
    setMsg(null);
    setBusy("Načítavam ZIP…");
    try {
      const JSZip = await loadZip();
      const zip = await JSZip.loadAsync(file);
      const raw = await zip.file("manifest.json")?.async("string");
      if (!raw) throw new Error("V ZIP-e chýba manifest.json — nie je to export z konfigurátora.");
      const manifest = JSON.parse(raw) as Manifest;
      if (manifest.format !== FORMAT || !Array.isArray(manifest.items) || !manifest.items.length) {
        throw new Error("Neznámy formát exportu.");
      }
      const out: CartItem[] = [];
      for (let i = 0; i < manifest.items.length; i++) {
        const m = manifest.items[i];
        setBusy(`Obnovujem položku ${i + 1}/${manifest.items.length}…`);
        // Pôvodný súbor (Blob / katalóg) ostáva, ak ešte existuje — zachová sa aj
        // poplatok za katalógový či AI model. Inak sa nahrá model zo ZIP-u.
        let fileKey = m.fileKey;
        if (!(m.fileKey && (await reachable(modelUrl(m.fileKey))))) {
          const entry = m.modelPath ? zip.file(m.modelPath) : null;
          if (!entry) throw new Error(`Chýba model „${m.fileName}“.`);
          const data = await entry.async("blob");
          const saved = await upload(safe(m.fileName), data, {
            access: "public",
            handleUploadUrl: "/api/blob/upload",
            multipart: data.size > 8 * 1024 * 1024,
            contentType: "application/octet-stream",
          });
          fileKey = saved.url;
        }
        const config = { ...m.config };
        if (config.sourceDrawingUrl && !(await reachable(config.sourceDrawingUrl))) {
          const entry = m.sourcePath ? zip.file(m.sourcePath) : null;
          if (entry) {
            const data = await entry.async("blob");
            const saved = await upload(`podklady/${safe(m.sourcePath!.split("/").pop()!)}`, data, {
              access: "public",
              handleUploadUrl: "/api/blob/upload",
              contentType: "application/octet-stream",
            });
            config.sourceDrawingUrl = saved.url;
          } else {
            delete config.sourceDrawingUrl;
          }
        }
        const item: CartItem = {
          id: `${Date.now()}-${i}`,
          fileKey,
          fileName: m.fileName,
          fileSize: m.fileSize,
          analysis: m.analysis,
          config,
          pricing: null,
        };
        // Cena podľa aktuálneho cenníka (nie zo starého exportu).
        item.pricing = (await quoteFor(item)) ?? m.pricing ?? null;
        out.push(item);
      }
      const replace =
        cartItems.length === 0 ||
        window.confirm(
          `Nahradiť aktuálny košík (${cartItems.length} ${cartItems.length === 1 ? "položka" : "položky"}) importovanou konfiguráciou?\n\nOK = nahradiť, Zrušiť = pridať ku košíku.`
        );
      onImport(out, replace);
      setMsg({ ok: true, text: `Importovaných položiek: ${out.length}.` });
    } catch (e: any) {
      setMsg({ ok: false, text: `Import zlyhal: ${e?.message || e}` });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-2.5 py-1 text-[11px] font-bold text-white">
        Admin
      </span>
      <button
        type="button"
        disabled={!!busy || cartItems.length === 0}
        onClick={exportZip}
        title={cartItems.length === 0 ? "Košík je prázdny" : "Stiahne ZIP s modelmi a všetkými parametrami"}
        className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold text-neutral-800 transition hover:border-[#FFAE00] disabled:opacity-50"
      >
        ⬇ Exportovať konfiguráciu
      </button>
      <button
        type="button"
        disabled={!!busy}
        onClick={() => inputRef.current?.click()}
        title="Nahrá ZIP z exportu a obnoví položky s rovnakým nastavením"
        className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold text-neutral-800 transition hover:border-[#FFAE00] disabled:opacity-50"
      >
        ⬆ Importovať konfiguráciu
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) importZip(f);
        }}
      />
      {busy && <span className="text-xs text-neutral-500">{busy}</span>}
      {!busy && msg && <span className={`text-xs font-semibold ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</span>}
    </div>
  );
}
