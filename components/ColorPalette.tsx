"use client";

type ColorOption = {
  id: string;
  name: string;
  // použijeme Tailwind triedy, aby sme nemuseli riešiť inline farby
  swatchClass: string; // napr. "bg-white"
  ringClass?: string; // pre bielu/žltú aby bola viditeľná
};

const COLORS: ColorOption[] = [
  { id: "black", name: "Čierna", swatchClass: "bg-black", ringClass: "ring-white/20" },
  { id: "white", name: "Biela", swatchClass: "bg-white", ringClass: "ring-black/20" },
  { id: "gray", name: "Sivá", swatchClass: "bg-zinc-400", ringClass: "ring-black/10" },
  { id: "red", name: "Červená", swatchClass: "bg-red-500" },
  { id: "blue", name: "Modrá", swatchClass: "bg-blue-500" },
  { id: "green", name: "Zelená", swatchClass: "bg-green-500" },
  { id: "purple", name: "Fialová", swatchClass: "bg-violet-500" },
  { id: "orange", name: "Oranžová", swatchClass: "bg-orange-500" },
];

export default function ColorPalette({
  value,
  onChange,
  disabled = false,
}: {
  value: string; // ukladáme id farby
  onChange: (id: string) => void;
  // Zákazníkovi nezáleží na farbe — farby sú šedé a nedajú sa vybrať.
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2" aria-disabled={disabled || undefined}>
      {COLORS.map((c) => {
        const active = !disabled && c.id === value;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            disabled={disabled}
            className={[
              "group relative h-9 w-9 rounded-xl transition",
              c.id === "white" ? "border-2 border-neutral-300 shadow-sm" : "border border-white/10",
              "ring-2 ring-transparent",
              active ? "outline outline-2 outline-[#7C3AED]" : "",
              disabled ? "cursor-not-allowed opacity-40 grayscale" : "",
            ].join(" ")}
            aria-label={c.name}
            title={disabled ? `${c.name} — nezáleží vám na farbe` : c.name}
          >
            <span className={`block h-full w-full rounded-xl ${c.swatchClass}`} />
          </button>
        );
      })}
    </div>
  );
}

// Popisky žijú v lib/print-options.ts spolu s materiálmi a kvalitami, aby
// administrácia aj e-maily hovorili o farbe rovnako ako konfigurátor.
export { COLOR_LABELS } from "@/lib/print-options";
