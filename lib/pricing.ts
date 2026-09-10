export const MATERIALS = ["PLA", "PETG", "ABS"] as const;
export const QUALITIES = ["DRAFT", "STANDARD", "FINE"] as const;

export type Material = (typeof MATERIALS)[number];
export type Quality = (typeof QUALITIES)[number];

export function isMaterial(value: unknown): value is Material {
  return MATERIALS.includes(value as Material);
}

export function isQuality(value: unknown): value is Quality {
  return QUALITIES.includes(value as Quality);
}

type QuoteInput = {
  volumeCm3: number;
  material: Material;
  quality: Quality;
  infillPct: number;
  quantity: number;
};

type QuoteResult = {
  gramsPerPart: number;
  printTimeMinPerPart: number;
  materialCostPerPart: number;
  machineCostPerPart: number;
  subtotalPerPart: number;
  setupFee: number;
  productionSubtotal: number;
  quantityDiscountPct: number;
  quantityDiscountAmount: number;
  total: number;
};

// Cena materiálu za gram (€/g) — zhodné s verejným cenníkom MaterialPricing.tsx
const MATERIAL_PRICE_PER_GRAM: Record<Material, number> = {
  PLA:  0.012,
  PETG: 0.016,
  ABS:  0.030,
};

const MATERIAL_DENSITY_G_PER_CM3: Record<Material, number> = {
  PLA:  1.24,
  PETG: 1.27,
  ABS:  1.04,
};

// Strojová sadzba €/hod (odpis stroja + elektrina + údržba + réžia)
const MACHINE_RATE_PER_HOUR: Record<Quality, number> = {
  DRAFT:    3.0,
  STANDARD: 3.5,
  FINE:     4.5,
};

// Minúty tlače na 1 gram skutočného materiálu
const PRINT_MIN_PER_GRAM: Record<Quality, number> = {
  DRAFT:    0.50,
  STANDARD: 0.65,
  FINE:     0.85,
};

// Základný poplatok za objednávku (nastavenie stroja, slicing, kontrola)
const SETUP_FEE = 10;

// Maximálny povolený infill
const MAX_INFILL_PCT = 50;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function getQuantityDiscountPct(quantity: number): number {
  if (quantity >= 100) return 15;
  if (quantity >= 50)  return 10;
  if (quantity >= 20)  return 5;
  return 0;
}

/**
 * Pomer skutočne spotrebovaného materiálu voči plnému objemu modelu.
 * Zohľadňuje steny (plášť je vždy plný) + infill vnútra.
 * Lineárna interpolácia: 5 % → 0.20, 20 % → 0.35, 50 % → 0.65
 */
function materialUsageRatio(infillPct: number): number {
  const safeInfill = clamp(infillPct, 5, MAX_INFILL_PCT);
  return clamp(0.20 + (safeInfill - 5) * 0.01, 0.20, 0.65);
}

export function quote(input: QuoteInput): QuoteResult {
  // Neznámy materiál alebo kvalita vyzdvihne z cenníkov `undefined` a celý
  // výpočet sa zmení na NaN — z toho vznikne cena `null` a Stripe potom
  // objednávku odmietne. Radšej padnúť tu, kde je príčina zrejmá.
  if (!isMaterial(input.material)) {
    throw new Error(`Neznámy materiál: ${String(input.material)}`);
  }

  if (!isQuality(input.quality)) {
    throw new Error(`Neznáma kvalita tlače: ${String(input.quality)}`);
  }

  const volumeCm3 = Math.max(0.1, Number(input.volumeCm3));
  const material  = input.material;
  const quality   = input.quality;
  const infillPct = clamp(Number(input.infillPct), 5, MAX_INFILL_PCT);
  const quantity  = Math.max(1, Number(input.quantity));

  const usageRatio = materialUsageRatio(infillPct);

  // Hmotnosť: objem × hustota × faktor výplne
  const gramsPerPartRaw = volumeCm3 * MATERIAL_DENSITY_G_PER_CM3[material] * usageRatio;

  // Čas tlače: gramy × min/gram, minimálne 5 minút
  const printTimeMinPerPartRaw = Math.max(5, gramsPerPartRaw * PRINT_MIN_PER_GRAM[quality]);

  // Náklady na materiál a stroj
  const materialCostPerPartRaw = gramsPerPartRaw * MATERIAL_PRICE_PER_GRAM[material];
  const machineCostPerPartRaw  = (printTimeMinPerPartRaw / 60) * MACHINE_RATE_PER_HOUR[quality];
  const subtotalPerPartRaw     = materialCostPerPartRaw + machineCostPerPartRaw;

  const productionSubtotalRaw     = subtotalPerPartRaw * quantity;
  const quantityDiscountPct       = getQuantityDiscountPct(quantity);
  const quantityDiscountAmountRaw = productionSubtotalRaw * (quantityDiscountPct / 100);

  // Minimálna celková cena objednávky = SETUP_FEE (10 €)
  const totalRaw = Math.max(
    SETUP_FEE,
    SETUP_FEE + productionSubtotalRaw - quantityDiscountAmountRaw
  );

  return {
    gramsPerPart:           round2(gramsPerPartRaw),
    printTimeMinPerPart:    round2(printTimeMinPerPartRaw),
    materialCostPerPart:    round2(materialCostPerPartRaw),
    machineCostPerPart:     round2(machineCostPerPartRaw),
    subtotalPerPart:        round2(subtotalPerPartRaw),
    setupFee:               SETUP_FEE,
    productionSubtotal:     round2(productionSubtotalRaw),
    quantityDiscountPct,
    quantityDiscountAmount: round2(quantityDiscountAmountRaw),
    total:                  round2(totalRaw),
  };
}
