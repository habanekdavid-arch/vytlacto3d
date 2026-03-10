export type MaterialKey = "PLA" | "PETG" | "ABS" | "TPU";
export type QualityKey = "DRAFT" | "STANDARD" | "FINE";

export type QuoteInput = {
  volumeCm3: number; // z analýzy
  material: MaterialKey;
  quality: QualityKey;
  infillPct: number; // 5–70
  quantity: number;
};

export type QuoteOutput = {
  gramsPerPart: number;
  printTimeMinPerPart: number;
  materialCostPerPart: number;
  machineCostPerPart: number;
  subtotalPerPart: number;
  total: number;

  breakdown: {
    density_g_cm3: number;
    infillPct: number;
    layerHeightMm: number;
    effectiveCm3PerHour: number;
    printerRateEurPerHour: number;
    wasteMultiplier: number;
    marginMultiplier: number;
    minimumOrderEur: number;
  };
};

// ====== Nastavenia ======

const DEFAULT_SPOOL_EUR = 12;
const SPOOL_G = 1000;

// ✅ minimálna cena objednávky
const MIN_ORDER_EUR = 10;

// rezerva na supporty, brim, nepresnosti, odpad
const WASTE_MULTIPLIER = 1.25;

// ✅ marža 1.2% = 1.012
const MARGIN_MULTIPLIER = 1.012;

// ✅ cena času (€/hod) – už bez tlačiarní
const PRINTER_RATE_EUR_PER_HOUR = 25.0;

// Materiály: hustota + koeficient rýchlosti (TPU pomalšie)
const MATERIALS: Record<
  MaterialKey,
  { density: number; spoolEur: number; speedMult: number }
> = {
  PLA: { density: 1.24, spoolEur: 12, speedMult: 1.0 },
  PETG: { density: 1.27, spoolEur: 13, speedMult: 0.9 },
  ABS: { density: 1.04, spoolEur: 14, speedMult: 0.85 },
  TPU: { density: 1.2, spoolEur: 15, speedMult: 0.6 },
};

// Kvalita = layer height + časový multiplier (jemnejšie = dlhšie)
const QUALITIES: Record<
  QualityKey,
  { label: string; layerHeightMm: number; timeMult: number }
> = {
  DRAFT: { label: "Rýchla", layerHeightMm: 0.28, timeMult: 0.75 },
  STANDARD: { label: "Štandard", layerHeightMm: 0.2, timeMult: 1.0 },
  FINE: { label: "Detailná", layerHeightMm: 0.12, timeMult: 1.6 },
};

// Jednoduchý odhad času z objemu (cm³):
const BASE_CM3_PER_HOUR = 18; // typicky 12–25

// 5–70% infill → multiplikátory (kontinuálne, nie 3 stavy)
function infillMaterialMult(infillPct: number) {
  // 20% => 1.0, 70% => ~1.6, 5% => ~0.82
  const p = clamp(infillPct, 5, 70);
  return 0.76 + 0.012 * p;
}
function infillTimeMult(infillPct: number) {
  // 20% => 1.0, 70% => ~1.4, 5% => ~0.88
  const p = clamp(infillPct, 5, 70);
  return 0.84 + 0.008 * p;
}

export function quote(input: QuoteInput): QuoteOutput {
  const qty = Math.max(1, Math.min(999, Math.floor(input.quantity || 1)));

  const mat = MATERIALS[input.material];
  const qual = QUALITIES[input.quality];

  const infillPct = clamp(Number(input.infillPct ?? 20), 5, 70);
  const materialMult = infillMaterialMult(infillPct);
  const timeMult = infillTimeMult(infillPct);

  // 1) Gramy
  const gramsRaw = input.volumeCm3 * mat.density * materialMult;
  const gramsPerPart = gramsRaw * WASTE_MULTIPLIER;

  // 2) Cena materiálu
  const spoolEur = mat.spoolEur ?? DEFAULT_SPOOL_EUR;
  const eurPerGram = spoolEur / SPOOL_G;
  const materialCostPerPart = gramsPerPart * eurPerGram;

  // 3) Odhad času
  // kvalita + infill + materiál spomaľuje
  const effectiveCm3PerHour =
    (BASE_CM3_PER_HOUR * mat.speedMult) / Math.max(1e-6, qual.timeMult * timeMult);

  const hoursPerPart = input.volumeCm3 / Math.max(1e-6, effectiveCm3PerHour);
  const printTimeMinPerPart = hoursPerPart * 60;

  // 4) Cena času
  const machineCostPerPart = hoursPerPart * PRINTER_RATE_EUR_PER_HOUR;

  // 5) Subtotal + marža
  const subtotalPerPart =
    (materialCostPerPart + machineCostPerPart) * MARGIN_MULTIPLIER;

  const totalRaw = subtotalPerPart * qty;
  const total = Math.max(MIN_ORDER_EUR, round2(totalRaw));

  return {
    gramsPerPart: round2(gramsPerPart),
    printTimeMinPerPart: round1(printTimeMinPerPart),
    materialCostPerPart: round2(materialCostPerPart),
    machineCostPerPart: round2(machineCostPerPart),
    subtotalPerPart: round2(subtotalPerPart),
    total,
    breakdown: {
      density_g_cm3: mat.density,
      infillPct,
      layerHeightMm: qual.layerHeightMm,
      effectiveCm3PerHour: round2(effectiveCm3PerHour),
      printerRateEurPerHour: PRINTER_RATE_EUR_PER_HOUR,
      wasteMultiplier: WASTE_MULTIPLIER,
      marginMultiplier: MARGIN_MULTIPLIER,
      minimumOrderEur: MIN_ORDER_EUR,
    },
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}