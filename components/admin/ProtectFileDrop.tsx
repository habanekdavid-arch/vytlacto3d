"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

type Done = { fileName: string; downloadUrl: string; size: number; original: string };

const ACCEPT = ".stl,.obj,.svg,.png,.jpg,.jpeg,.webp";
const OK_EXT = /\.(stl|obj|svg|png|jpe?g|webp)$/i;

function safe(name: string) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
}

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} kB`);

/** Pretiahnite súbor → zamknutý .v3d, ktorý otvorí len náš konfigurátor. */
export default function ProtectFileDrop() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Done[]>([]);

  async function handle(files: FileList | File[]) {
    setError("");
    for (const file of Array.from(files)) {
      if (!OK_EXT.test(file.name)) {
        setError(`${file.name}: podporujeme STL, OBJ, SVG, PNG, JPG a WEBP.`);
        continue;
      }
      if (file.size > 100 * 1024 * 1024) {
        setError(`${file.name}: súbor je väčší ako 100 MB.`);
        continue;
      }
      setBusy(file.name);
      try {
        const blob = await upload(`na-zamknutie/${safe(file.name)}`, file, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
          multipart: file.size > 8 * 1024 * 1024,
          contentType: file.type || "application/octet-stream",
        });
        const res = await fetch("/api/admin/protect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: blob.url, fileName: file.name }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Súbor sa nepodarilo zamknúť.");
        setDone((d) => [{ fileName: data.fileName, downloadUrl: data.downloadUrl, size: data.size, original: file.name }, ...d]);
        // Stiahnutie hneď po zamknutí.
        const a = document.createElement("a");
        a.href = data.downloadUrl;
        a.download = data.fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (e: any) {
        setError(`${file.name}: ${e?.message || "chyba"}`);
      } finally {
        setBusy(null);
      }
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) handle(e.dataTransfer.files);
        }}
        onClick={() => !busy && inputRef.current?.click()}
        className={[
          "cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition",
          dragging ? "border-[#FFAE00] bg-[#FFAE00]/10" : "border-neutral-300 bg-white hover:border-[#FFAE00]/60 hover:bg-neutral-50",
        ].join(" ")}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white shadow-sm">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>
        <div className="mt-4 text-lg font-extrabold text-neutral-900">
          {busy ? `Zamykám ${busy}…` : "Pretiahnite sem model, SVG alebo obrázok"}
        </div>
        <p className="mt-1 text-sm text-neutral-500">STL, OBJ, SVG, PNG, JPG, WEBP · do 100 MB · aj viac súborov naraz</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handle(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {done.length > 0 && (
        <ul className="mt-6 divide-y divide-neutral-100 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
          {done.map((d) => (
            <li key={d.downloadUrl} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <div className="font-semibold text-neutral-900">{d.fileName}</div>
                <div className="text-xs text-neutral-500">z {d.original} · {kb(d.size)}</div>
              </div>
              <a href={d.downloadUrl} download={d.fileName} className="rounded-xl bg-[#FFAE00] px-4 py-2 text-sm font-bold text-black hover:opacity-90">
                Stiahnuť .v3d
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
