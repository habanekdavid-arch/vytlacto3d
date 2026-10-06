"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|svg)$/i;

function isImage(file: File) {
  return file.type.startsWith("image/") || IMAGE_EXT.test(file.name);
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

  function take(list: FileList | null | undefined) {
    const files = Array.from(list ?? []).filter(isImage);
    if (!files.length) return;
    onFiles(multiple ? files : files.slice(0, 1));
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!disabled) take(e.dataTransfer.files);
      }}
      className={[
        "cursor-pointer outline-none transition focus-visible:ring-4 focus-visible:ring-[#FFAE00]/30",
        className,
        dragOver ? activeClassName : "",
        disabled ? "pointer-events-none opacity-50" : "",
      ].join(" ")}
    >
      {children}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
