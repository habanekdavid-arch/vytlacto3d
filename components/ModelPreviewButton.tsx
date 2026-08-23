"use client";

import { useState } from "react";
import StlViewer from "@/components/StlViewer";

export default function ModelPreviewButton({
  fileKey,
  fileName,
  scalePct = 100,
  colorId = "black",
  label = "👁 3D náhľad",
  className,
}: {
  fileKey: string;
  fileName: string;
  scalePct?: number;
  colorId?: string;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-bold text-neutral-900 shadow-sm transition hover:bg-neutral-50"
        }
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Zavrieť"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <StlViewer
              fileKey={fileKey}
              title={fileName}
              scalePct={scalePct}
              colorId={colorId}
              height={500}
            />
          </div>
        </div>
      )}
    </>
  );
}
