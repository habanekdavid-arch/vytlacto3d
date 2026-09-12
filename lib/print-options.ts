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
