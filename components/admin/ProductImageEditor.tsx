"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageDropZone from "@/components/admin/ImageDropZone";

/**
 * Náhľadový obrázok jedného produktu: nový sa pretiahne alebo vyberie,
 * nahrá do úložiska a hneď sa zobrazí v katalógu aj na detaile produktu.
 */
export default function ProductImageEditor({
  slug,
  name,
  image,
  defaultImage,
}: {
  slug: string;
  name: string;
  image: string;
  defaultImage: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const custom = image !== defaultImage;

  async function save(method: "POST" | "DELETE", url?: string) {
    const res = await fetch("/api/admin/products/image", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, url }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || "Uloženie zlyhalo.");
    router.refresh();
  }

  async function handleFiles(files: File[]) {
    const file = files[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { upload } = await import("@vercel/blob/client");
      const blob = await upload(`produkty/${slug}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
      });
      await save("POST", blob.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nahratie zlyhalo.");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!confirm(`Vrátiť pôvodný obrázok produktu „${name}“?`)) return;
    setBusy(true);
    setError(null);
    try {
      await save("DELETE");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Uloženie zlyhalo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <ImageDropZone
        onFiles={handleFiles}
        disabled={busy}
        className="group relative block aspect-square w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-100 transition hover:border-[#FFAE00]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={name} className="h-full w-full object-cover" />
        <span className="absolute inset-x-3 bottom-3 rounded-xl bg-white/90 px-3 py-2 text-center text-xs font-bold text-neutral-900 shadow-sm">
          {busy ? "Nahrávam…" : "Pretiahni sem obrázok alebo klikni"}
        </span>
      </ImageDropZone>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className={custom ? "font-semibold text-green-700" : "text-neutral-500"}>
          {custom ? "Vlastný obrázok" : "Pôvodný obrázok"}
        </span>
        {custom && (
          <button type="button" onClick={reset} disabled={busy} className="font-semibold text-neutral-500 underline hover:text-neutral-900 disabled:opacity-50">
            Vrátiť pôvodný
          </button>
        )}
      </div>
      {error && <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</div>}
    </div>
  );
}
