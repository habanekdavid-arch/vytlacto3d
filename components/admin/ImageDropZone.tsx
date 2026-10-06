"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|svg|heic|heif)$/i;
const HEIC = /\.(heic|heif)$/i;

function isImage(file: File) {
  return file.type.startsWith("image/") || IMAGE_EXT.test(file.name);
}

function isHeic(file: File) {
  return /image\/hei[cf]/i.test(file.type) || HEIC.test(file.name);
}

/**
 * Fotky z iPhonu (HEIC) úložisko ani väčšina prehliadačov nepozná — prevedú
 * sa na JPG ešte v prehliadači. Knižnica sa načíta len keď je to treba.
 */
async function toUploadable(file: File): Promise<File> {
  if (!isHeic(file)) return file;
  const { default: heic2any } = await import("heic2any");
  const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const blob = Array.isArray(out) ? out[0] : out;
  return new File([blob], file.name.replace(HEIC, "") + ".jpg", { type: "image/jpeg" });
}

/**
 * Políčko na fotky v CMS: fotku sem stačí pretiahnuť myšou, alebo naň kliknúť
 * a vybrať ju. Kým je na stránke, fotka pustená vedľa políčka neotvorí
 * v prehliadači obrázok namiesto formulára (a neprídeš o neuložené zmeny).
 */
export default function ImageDropZone({
  onFiles,
  multiple = false,
  disabled = false,
  className = "",
  activeClassName = "border-[#FFAE00] bg-[#FFAE00]/10",
  children,
}: {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  activeClassName?: string;
  children: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const block = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);

  async function take(list: FileList | null | undefined) {
    const all = Array.from(list ?? []);
    const images = all.filter(isImage);
    if (!all.length) {
      // Obrázok pretiahnutý z inej webstránky alebo z chatu nie je súbor.
      setNotice("Sem sa dá pretiahnuť len súbor z počítača — fotku najprv ulož a potom ju pretiahni.");
      return;
    }
    if (!images.length) {
      setNotice("Toto nie je fotka. Podporované sú JPG, PNG, WEBP, GIF a HEIC.");
      return;
    }
    setNotice(null);
    const picked = multiple ? images : images.slice(0, 1);
    setBusy(true);
    try {
      onFiles(await Promise.all(picked.map(toUploadable)));
    } catch {
      setNotice("Fotku sa nepodarilo previesť. Ulož ju ako JPG a skús znova.");
    } finally {
      setBusy(false);
    }
  }

  const off = disabled || busy;

  return (
    <div
      role="button"
      tabIndex={off ? -1 : 0}
      aria-disabled={off || undefined}
      onClick={() => !off && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!off && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      // Safari a Firefox pustia súbor na prvok len vtedy, keď ho prvok
      // prijme už pri dragenter — samotný dragover nestačí.
      onDragEnter={(e) => {
        e.preventDefault();
        if (!off) setDragOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = off ? "none" : "copy";
        if (!off) setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!off) void take(e.dataTransfer.files);
      }}
      className={[
        "cursor-pointer outline-none transition focus-visible:ring-4 focus-visible:ring-[#FFAE00]/30",
        className,
        dragOver ? activeClassName : "",
        off ? "opacity-60" : "",
      ].join(" ")}
    >
      {children}
      {busy && <span className="text-xs font-semibold text-neutral-500">Pripravujem fotku…</span>}
      {notice && !busy && <span className="text-xs font-semibold text-red-600">{notice}</span>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple={multiple}
        className="hidden"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          void take(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
