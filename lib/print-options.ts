import { MATERIALS, QUALITIES, type Material, type Quality } from "@/lib/pricing";

/**
 * Popisky nastavení tlače — presne v tom znení, aké vidí zákazník
 * v konfigurátore. Administrácia, e-maily aj faktúry čerpajú odtiaľto,
 * aby sa nikde neobjavila hodnota, ktorú si zákazník nemohol vybrať
 * (napríklad surové "FINE" namiesto "Detailná").
 */
export const QUALITY_LABELS: Record<Quality, string> = {
  DRAFT: "Rýchla",
  STANDARD: "Štandard",
  FINE: "Detailná",
};

export const MATERIAL_LABELS: Record<Material, string> = {
  PLA: "PLA",
  PETG: "PETG",
  ABS: "ABS",
  "PA6-CF": "PA6-CF",
};

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

/**
 * Neznámu hodnotu vraciame tak, ako je uložená. Staršie objednávky môžu niesť
 * čokoľvek a zamlčať to za pomlčkou by pri vybavovaní zavádzalo viac
 * ako surová hodnota.
 */
function label(value: unknown, labels: Record<string, string>, fallback: string): string {
  if (value === null || value === undefined || value === "") return fallback;

  const key = String(value);
  return labels[key] ?? key;
}

export function qualityLabel(value: unknown, fallback = "—"): string {
  return label(value, QUALITY_LABELS, fallback);
}

export function materialLabel(value: unknown, fallback = "—"): string {
  return label(value, MATERIAL_LABELS, fallback);
}

export function colorLabel(value: unknown, fallback = "—"): string {
  return label(value, COLOR_LABELS, fallback);
}

/** Farby častí viacfarebnej položky, alebo null pri jednofarebnej. */
export function multicolorParts(config: unknown): string[] | null {
  const parts = (config as { partColors?: unknown } | null)?.partColors;
  if (!Array.isArray(parts) || new Set(parts).size < 2) return null;
  return parts.map(String);
}

/** „Viacfarebná: Červená, Modrá“ alebo popisok jednej farby. */
export function colorSummary(config: unknown, fallback = "—"): string {
  const parts = multicolorParts(config);
  if (!parts) return colorLabel((config as { color?: unknown } | null)?.color, fallback);
  return `Viacfarebná: ${Array.from(new Set(parts)).map((c) => colorLabel(c)).join(", ")}`;
}

/** Pre výrobu: „1 Červená, 2 Modrá, …“ — časti od najväčšej podľa objemu. */
export function partColorsLabel(config: unknown): string | null {
  const parts = multicolorParts(config);
  return parts ? parts.map((c, i) => `${i + 1} ${colorLabel(c)}`).join(", ") : null;
}

/**
 * Voľby pre rozbaľovacie zoznamy v administrácii. Ukladá sa kód, zobrazuje
 * popisok — administrátor tak nemôže uložiť kvalitu, ktorú cenník nepozná
 * (taká hodnota by z cenníka vyzdvihla `undefined` a cena by vyšla NaN).
 */
export const QUALITY_OPTIONS = QUALITIES.map((value) => ({
  value,
  label: QUALITY_LABELS[value],
}));

export const MATERIAL_OPTIONS = MATERIALS.map((value) => ({
  value,
  label: MATERIAL_LABELS[value],
}));

export const COLOR_OPTIONS = Object.entries(COLOR_LABELS).map(([value, text]) => ({
  value,
  label: text,
}));
