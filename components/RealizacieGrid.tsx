"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { LG_CLASS, MD_CLASS, layoutRealizacie, type Tile } from "@/lib/realizacie-layout";

export type RealizaciaCard = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  category: string;
  material: string;
  leadTime: string;
  featured: boolean;
};

const ALL = "__all__";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

function sizesFor(tile: Tile<RealizaciaCard>) {
  if (tile.lg === "4x1" || tile.lg === "4x2") return "(min-width: 1024px) 1200px, (min-width: 768px) 100vw, 100vw";
  if (tile.lg === "2x2" || tile.lg === "2x1") return "(min-width: 1024px) 600px, (min-width: 768px) 100vw, 100vw";
  return "(min-width: 1024px) 300px, (min-width: 768px) 50vw, 100vw";
}

function Card({ tile, priority }: { tile: Tile<RealizaciaCard>; priority: boolean }) {
  const p = tile.item;
  const meta = [p.material, p.leadTime].filter((v) => v && v.trim());

  return (
    <Link
      href={`/realizacie/${p.slug}`}
      className={[
        "group relative overflow-hidden rounded-[28px] bg-neutral-900 shadow-sm ring-1 ring-black/5 transition duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#FFAE00]/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFAE00]",
        "col-span-1 row-span-1",
        MD_CLASS[tile.md],
        LG_CLASS[tile.lg],
      ].join(" ")}
    >
      <Image
        src={p.image}
        alt={p.title}
        fill
        priority={priority}
        sizes={sizesFor(tile)}
        className="object-cover transition duration-700 ease-out group-hover:scale-105"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

      <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-900 shadow-sm backdrop-blur">
        {p.category}
      </div>

      <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#FFAE00] text-black opacity-0 shadow-lg transition duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
        <ArrowIcon />
      </div>

      <div className={`absolute inset-x-0 bottom-0 ${tile.large ? "p-6 md:p-8" : "p-5"}`}>
        <h2
          className={[
            "font-extrabold leading-tight tracking-tight text-white",
            tile.large ? "text-2xl md:text-4xl" : "text-xl",
          ].join(" ")}
        >
          {p.title}
        </h2>

        <p className={`mt-1.5 text-sm font-medium text-white/80 ${tile.large ? "line-clamp-2 md:text-base" : "line-clamp-1"}`}>
          {p.subtitle}
        </p>

        {tile.large && (
          <p className="mt-3 hidden max-w-xl text-sm leading-relaxed text-white/75 md:line-clamp-2">{p.description}</p>
        )}

        {tile.large && meta.length > 0 && (
          <div className="mt-4 hidden flex-wrap gap-2 md:flex">
            {meta.map((m) => (
              <span key={m} className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur">
                {m}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function RealizacieGrid({ projects }: { projects: RealizaciaCard[] }) {
  const [active, setActive] = useState(ALL);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of projects) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    return [...counts.entries()];
  }, [projects]);

  const tiles = useMemo(() => {
    const visible = active === ALL ? projects : projects.filter((p) => p.category === active);
    return layoutRealizacie(visible, (p) => p.featured);
  }, [projects, active]);

  const chip = (selected: boolean) =>
    [
      "rounded-full px-4 py-2 text-sm font-semibold transition",
      selected
        ? "bg-neutral-900 text-white shadow-sm"
        : "border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50",
    ].join(" ");

  return (
    <>
      {categories.length > 1 && (
        <div className="mb-8 flex flex-wrap justify-center gap-2" role="tablist" aria-label="Filtrovať realizácie podľa kategórie">
          <button type="button" role="tab" aria-selected={active === ALL} onClick={() => setActive(ALL)} className={chip(active === ALL)}>
            Všetko <span className="opacity-60">{projects.length}</span>
          </button>
          {categories.map(([name, count]) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={active === name}
              onClick={() => setActive(name)}
              className={chip(active === name)}
            >
              {name} <span className="opacity-60">{count}</span>
            </button>
          ))}
        </div>
      )}

      <section className="grid auto-rows-[280px] grid-cols-1 gap-5 md:auto-rows-[300px] md:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile, i) => (
          <Card key={tile.item.slug} tile={tile} priority={i < 2} />
        ))}
      </section>
    </>
  );
}
