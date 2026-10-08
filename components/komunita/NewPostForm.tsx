"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ImageDropZone from "@/components/admin/ImageDropZone";
import {
  COMMUNITY_BLOB_PREFIX,
  COMMUNITY_CATEGORIES,
  COMMUNITY_MAX_IMAGE_MB,
  COMMUNITY_MAX_IMAGES,
  COMMUNITY_STORY_MAX,
  COMMUNITY_STORY_MIN,
  COMMUNITY_TITLE_MAX,
} from "@/lib/komunita";
import { safeContactFileName } from "@/lib/contact-attachments";
import { MATERIAL_OPTIONS } from "@/lib/print-options";

type Photo = {
  id: string;
  preview: string;
  status: "uploading" | "done" | "error";
  progress: number;
  url?: string;
};

export type OrderOption = { id: string; label: string };

const inputClass =
  "w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#FFAE00] focus:ring-4 focus:ring-[#FFAE00]/20";

export default function NewPostForm({ orders }: { orders: OrderOption[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [category, setCategory] = useState("");
  const [material, setMaterial] = useState("");
  const [orderId, setOrderId] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const uploading = photos.some((p) => p.status === "uploading");
  const ready = photos.filter((p) => p.status === "done" && p.url);

  function patch(id: string, data: Partial<Photo>) {
    setPhotos((list) => list.map((p) => (p.id === id ? { ...p, ...data } : p)));
  }

  async function uploadPhoto(photo: Photo, file: File) {
    try {
      const { upload } = await import("@vercel/blob/client");
      const blob = await upload(`${COMMUNITY_BLOB_PREFIX}${safeContactFileName(file.name)}`, file, {
        access: "public",
        handleUploadUrl: "/api/komunita/upload",
        contentType: file.type || "image/jpeg",
        onUploadProgress: ({ percentage }) => patch(photo.id, { progress: Math.round(percentage) }),
      });
      patch(photo.id, { status: "done", progress: 100, url: blob.url });
    } catch {
      patch(photo.id, { status: "error" });
    }
  }

  function addFiles(files: File[]) {
    setNotice(null);
    const free = COMMUNITY_MAX_IMAGES - photos.length;
    const tooBig = files.filter((f) => f.size > COMMUNITY_MAX_IMAGE_MB * 1024 * 1024);
    const accepted = files.filter((f) => !tooBig.includes(f)).slice(0, Math.max(0, free));
    const problems: string[] = [];
    if (tooBig.length) problems.push(`Fotka môže mať najviac ${COMMUNITY_MAX_IMAGE_MB} MB.`);
    if (files.length - tooBig.length > accepted.length) problems.push(`Najviac ${COMMUNITY_MAX_IMAGES} fotiek.`);
    if (problems.length) setNotice(problems.join(" "));

    const created = accepted.map((file) => ({
      file,
      photo: {
        id: crypto.randomUUID(),
        preview: URL.createObjectURL(file),
        status: "uploading" as const,
        progress: 0,
      },
    }));
    setPhotos((list) => [...list, ...created.map((c) => c.photo)]);
    for (const c of created) void uploadPhoto(c.photo, c.file);
  }

  function removePhoto(id: string) {
    setPhotos((list) => {
      const photo = list.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.preview);
      return list.filter((p) => p.id !== id);
    });
  }

  function makeCover(id: string) {
    setPhotos((list) => {
      const photo = list.find((p) => p.id === id);
      return photo ? [photo, ...list.filter((p) => p.id !== id)] : list;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!ready.length) return setError("Pridaj aspoň jednu fotku.");
    if (uploading) return setError("Počkaj, kým sa nahrajú všetky fotky.");
    setSending(true);
    try {
      const res = await fetch("/api/komunita/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          story,
          category,
          material,
          orderId,
          images: ready.map((p) => p.url),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Príspevok sa nepodarilo uložiť.");
      router.push(`/komunita/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Príspevok sa nepodarilo uložiť.");
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <div>
        <label className="text-sm font-bold text-neutral-900">Fotky výtlačku *</label>
        <p className="mt-1 text-sm text-neutral-500">
          Ukáž, ako výtlačok vyzerá v praxi — namontovaný, používaný, v akcii. Prvá fotka bude titulná.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p, idx) => (
            <div key={p.id} className="group relative aspect-square overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
              <Image src={p.preview} alt="" fill unoptimized className="object-cover" />
              {idx === 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-[#FFAE00] px-2 py-0.5 text-[11px] font-bold text-black">
                  Titulná
                </span>
              )}
              {p.status === "uploading" && (
                <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-xs font-semibold text-white">
                  Nahrávam… {p.progress} %
                </div>
              )}
              {p.status === "error" && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-600/70 p-2 text-center text-xs font-bold text-white">
                  Nahrávanie zlyhalo
                </div>
              )}
              <div className="absolute right-2 top-2 flex gap-1">
                {idx > 0 && p.status === "done" && (
                  <button
                    type="button"
                    onClick={() => makeCover(p.id)}
                    className="rounded-full bg-white/90 px-2 py-1 text-[11px] font-bold text-neutral-800 shadow-sm"
                  >
                    Titulná
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(p.id)}
                  aria-label="Odstrániť fotku"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm font-bold text-neutral-800 shadow-sm"
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {photos.length < COMMUNITY_MAX_IMAGES && (
            <ImageDropZone
              multiple
              onFiles={addFiles}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-3 text-center text-sm text-neutral-600 hover:border-[#FFAE00]"
            >
              <span className="text-2xl">📷</span>
              <span className="font-semibold">Pridať fotky</span>
              <span className="text-xs text-neutral-400">
                {photos.length}/{COMMUNITY_MAX_IMAGES}
              </span>
            </ImageDropZone>
          )}
        </div>
        {notice && <p className="mt-2 text-sm font-semibold text-red-600">{notice}</p>}
      </div>

      <div>
        <label htmlFor="kp-title" className="text-sm font-bold text-neutral-900">
          Názov *
        </label>
        <input
          id="kp-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={COMMUNITY_TITLE_MAX}
          required
          placeholder="Napr. Náhradný kryt na robotický vysávač"
          className={`mt-2 ${inputClass}`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="kp-category" className="text-sm font-bold text-neutral-900">
            Kategória *
          </label>
          <select
            id="kp-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className={`mt-2 ${inputClass}`}
          >
            <option value="">Vyber…</option>
            {COMMUNITY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="kp-material" className="text-sm font-bold text-neutral-900">
            Materiál
          </label>
          <select id="kp-material" value={material} onChange={(e) => setMaterial(e.target.value)} className={`mt-2 ${inputClass}`}>
            <option value="">Neviem / iný</option>
            {MATERIAL_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {orders.length > 0 && (
        <div>
          <label htmlFor="kp-order" className="text-sm font-bold text-neutral-900">
            Z ktorej objednávky je výtlačok?
          </label>
          <p className="mt-1 text-sm text-neutral-500">
            Keď ju priradíš, pri príspevku sa zobrazí odznak „Overený zákazník“. Číslo objednávky sa verejne nezobrazí.
          </p>
          <select id="kp-order" value={orderId} onChange={(e) => setOrderId(e.target.value)} className={`mt-2 ${inputClass}`}>
            <option value="">Nepriradiť</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="kp-story" className="text-sm font-bold text-neutral-900">
          Tvoj príbeh *
        </label>
        <p className="mt-1 text-sm text-neutral-500">
          Aký problém výtlačok vyriešil? Ako sa osvedčil? Čo by si poradil ostatným?
        </p>
        <textarea
          id="kp-story"
          value={story}
          onChange={(e) => setStory(e.target.value)}
          minLength={COMMUNITY_STORY_MIN}
          maxLength={COMMUNITY_STORY_MAX}
          required
          rows={8}
          className={`mt-2 resize-y ${inputClass}`}
        />
        <div className="mt-1 text-right text-xs text-neutral-400">
          {story.length}/{COMMUNITY_STORY_MAX}
        </div>
      </div>

      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-neutral-500">
          Príspevok pred zverejnením skontrolujeme. Verejne sa ukáže len tvoje krstné meno a začiatočné písmeno priezviska.
        </p>
        <button
          type="submit"
          disabled={sending || uploading}
          className="shrink-0 rounded-2xl bg-[#FFAE00] px-6 py-3 text-sm font-bold text-black shadow-sm transition hover:brightness-95 disabled:opacity-50"
        >
          {sending ? "Odosielam…" : uploading ? "Nahrávam fotky…" : "Odoslať príspevok"}
        </button>
      </div>
    </form>
  );
}
