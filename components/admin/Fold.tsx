"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Rozbaľovacia sekcia administrácie: tenký riadok s názvom a krátkym
 * zhrnutím, obsah sa ukáže po kliknutí. Odkaz s #id (napr. /admin/orders/x#packeta)
 * sekciu sám otvorí a nascrolluje na ňu.
 */
export default function Fold({
  id,
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  id?: string;
  title: React.ReactNode;
  summary?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    const check = () => {
      if (window.location.hash === `#${id}`) {
        setOpen(true);
        window.setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      }
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [id]);

  return (
    <div id={id} ref={ref} className="scroll-mt-24 border-b border-neutral-200 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-neutral-50"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-neutral-400 transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
        <span className="text-sm font-bold text-neutral-900">{title}</span>
        {summary !== undefined && (
          <span className="ml-auto min-w-0 truncate text-right text-xs text-neutral-500">{summary}</span>
        )}
      </button>
      {open && <div className="px-4 pb-5 pt-1">{children}</div>}
    </div>
  );
}
