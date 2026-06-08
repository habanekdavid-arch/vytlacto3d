type Material = "PLA" | "PETG" | "ABS" | "TPU";
type Quality = "DRAFT" | "STANDARD" | "FINE";

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

// Cena materiálu za gram (€/g) vrátane straty pri tlači ~15 %
const MATERIAL_PRICE_PER_GRAM: Record<Material, number> = {
  PLA:  0.022,
  PETG: 0.026,
  ABS:  0.028,
  TPU:  0.034,
};

const MATERIAL_DENSITY_G_PER_CM3: Record<Material, number> = {
  PLA:  1.24,
  PETG: 1.27,
  ABS:  1.04,
  TPU:  1.21,
};

// Strojová sadzba €/hod (odpis stroja + elektrina + údržba + réžia)
const MACHINE_RATE_PER_HOUR: Record<Quality, number> = {
  DRAFT:    4.5,
  STANDARD: 5.5,
  FINE:     7.0,
};

// Minúty tlače na 1 cm³ skutočného materiálu (empiricky kalibrované)
// DRAFT = rýchla tlač 0.3 mm, STANDARD = 0.2 mm, FINE = 0.15 mm
const PRINT_MIN_PER_CM3_MATERIAL: Record<Quality, number> = {
  DRAFT:    14,
  STANDARD: 22,
  FINE:     34,
};

// Základný poplatok za objednávku (nastavenie stroja, slicing, kontrola)
const SETUP_FEE = 15;

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
 * Odhadovaný pomer skutočne spotrebovaného materiálu voči plnému
 * objemu modelu. Zohľadňuje steny (perimeters) + infill + podlahy/stropy.
 * Pre typický FDM model (3 perimeters + top/bottom 4 vrstvy):
 *   - 5 % infill  → ~28 % hustota
 *   - 20 % infill → ~37 % hustota
 *   - 50 % infill → ~54 % hustota
 */
function materialUsageRatio(infillPct: number): number {
  const safeInfill = clamp(infillPct, 5, MAX_INFILL_PCT);
  // Steny + podlahy/stropy sú konštantné ~25 %, infill sa pridáva lineárne
  const ratio = 0.25 + (safeInfill / 100) * 0.58;
  return clamp(ratio, 0.28, 0.76);
}

export function quote(input: QuoteInput): QuoteResult {
  const volumeCm3 = Math.max(0.1, Number(input.volumeCm3));
  const material  = input.material;
  const quality   = input.quality;
  const infillPct = clamp(Number(input.infillPct), 5, MAX_INFILL_PCT);
  const quantity  = Math.max(1, Number(input.quantity));

  const usageRatio       = materialUsageRatio(infillPct);
  const materialVolumeCm3 = volumeCm3 * usageRatio;

  // Hmotnosť
  const gramsPerPartRaw = materialVolumeCm3 * MATERIAL_DENSITY_G_PER_CM3[material];

  // Čas tlače — objem skutočného materiálu × minúty/cm³
  const printTimeMinPerPartRaw = Math.max(
    8,
    materialVolumeCm3 * PRINT_MIN_PER_CM3_MATERIAL[quality]
  );

  // Náklady
  const materialCostPerPartRaw =
    gramsPerPartRaw * MATERIAL_PRICE_PER_GRAM[material];

  const machineCostPerPartRaw =
    (printTimeMinPerPartRaw / 60) * MACHINE_RATE_PER_HOUR[quality];

  // Minimálna cena za kus (pokryje náklady pri veľmi malých modeloch)
  const minCostPerPart = 0.5;
  const subtotalPerPartRaw = Math.max(
    minCostPerPart,
    materialCostPerPartRaw + machineCostPerPartRaw
  );

  const productionSubtotalRaw = subtotalPerPartRaw * quantity;

  const quantityDiscountPct       = getQuantityDiscountPct(quantity);
  const quantityDiscountAmountRaw = productionSubtotalRaw * (quantityDiscountPct / 100);

  const totalRaw = SETUP_FEE + productionSubtotalRaw - quantityDiscountAmountRaw;

  return {
    gramsPerPart:           round2(gramsPerPartRaw),
    printTimeMinPerPart:    round2(printTimeMinPerPartRaw),
    materialCostPerPart:    round2(materialCostPerPartRaw),
    machineCostPerPart:     round2(machineCostPerPartRaw),
    subtotalPerPart:        round2(subtotalPerPartRaw),
    setupFee:               round2(SETUP_FEE),
    productionSubtotal:     round2(productionSubtotalRaw),
    quantityDiscountPct,
    quantityDiscountAmount: round2(quantityDiscountAmountRaw),
    total:                  round2(totalRaw),
  };
}
