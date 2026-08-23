"use client";

import { useEffect, useState } from "react";
import StlViewer from "@/components/StlViewer";

type ModelItem = {
  fileKey: string;
  fileName: string;
  scalePct?: number;
  colorId?: string;
};

export default function ModelPreviewAllButton({
  items,
  className,
}: {
  items: ModelItem[];
  className?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (openIndex === null) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowRight") setOpenIndex((i) => (i === null ? i : (i + 1) % items.length));
      if (e.key === "ArrowLeft") setOpenIndex((i) => (i === null ? i : (i - 1 + items.length) % items.length));
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [openIndex, items.length]);

  if (items.length === 0) return null;

  const current = openIndex !== null ? items[openIndex] : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenIndex(0)}
        className={
          className ??
          "rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-bold text-neutral-900 shadow-sm transition hover:bg-neutral-50"
        }
      >
        👁 Náhľad všetkých modelov ({items.length})
      </button>

      {current && openIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpenIndex(null)}
        >
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-white">
                {openIndex + 1} / {items.length} — {current.fileName}
              </div>

              <div className="flex items-center gap-2">
                {items.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setOpenIndex((openIndex - 1 + items.length) % items.length)}
                      aria-label="Predchádzajúci model"
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenIndex((openIndex + 1) % items.length)}
                      aria-label="Ďalší model"
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setOpenIndex(null)}
                  aria-label="Zavrieť"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <StlViewer
              key={current.fileKey}
              fileKey={current.fileKey}
              title={current.fileName}
              scalePct={current.scalePct}
              colorId={current.colorId}
              height={500}
            />
          </div>
        </div>
      )}
    </>
  );
}
