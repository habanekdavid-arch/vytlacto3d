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
}: {
  value: string; // ukladáme id farby
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map((c) => {
        const active = c.id === value;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={[
              "group relative h-9 w-9 rounded-xl border border-white/10",
              "ring-2 ring-transparent",
              c.ringClass ? `ring-inset ${c.ringClass}` : "",
              active ? "outline outline-2 outline-[#7C3AED]" : "hover:border-white/20",
            ].join(" ")}
            aria-label={c.name}
            title={c.name}
          >
            <span className={`block h-full w-full rounded-xl ${c.swatchClass}`} />
          </button>
        );
      })}
    </div>
  );
}

export const COLOR_LABELS: Record<string, string> = {
  black: "Čierna",
  white: "Biela",
  gray: "Sivá",
  red: "Červená",
  blue: "Modrá",
  green: "Zelená",
  purple: "Fialová",
  orange: "Oranžová",
};
