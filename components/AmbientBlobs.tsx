"use client";

import { useEffect, useRef } from "react";
import { startAmbientBlobs } from "@/lib/ambient";

/** Rozmazané farebné škvrny za obsahom. "hero" = úvod stránky, "contact" = menšie v kontaktnej karte. */
export default function AmbientBlobs({ variant }: { variant: "hero" | "contact" }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => (ref.current ? startAmbientBlobs(ref.current) : undefined), []);

  return (
    <div ref={ref} aria-hidden="true" className={`ambient ambient--${variant}`}>
      {variant === "hero" ? (
        <>
          <div data-blob className="ambient-blob ambient-blob--blue" />
          <div data-blob className="ambient-blob ambient-blob--orange" />
          <div data-blob className="ambient-blob ambient-blob--violet" />
        </>
      ) : (
        <>
          <div data-blob className="ambient-blob ambient-blob--orange" />
          <div data-blob className="ambient-blob ambient-blob--blue" />
        </>
      )}
    </div>
  );
}
