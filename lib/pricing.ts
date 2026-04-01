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

const MATERIAL_PRICE_PER_GRAM: Record<Material, number> = {
  PLA: 0.012,
  PETG: 0.013,
  ABS: 0.014,
  TPU: 0.015,
};

const MATERIAL_DENSITY_G_PER_CM3: Record<Material, number> = {
  PLA: 1.24,
  PETG: 1.27,
  ABS: 1.04,
  TPU: 1.21,
};

// hodinové sadzby bez DPH
const MACHINE_RATE_PER_HOUR: Record<Quality, number> = {
  DRAFT: 2.8,
  STANDARD: 3.1,
  FINE: 3.5,
};

const SETUP_FEE = 10;

// zľavy presne podľa tvojho zadania
function getQuantityDiscountPct(quantity: number): number {
  if (quantity >= 100) return 15;
  if (quantity >= 50) return 10;
  if (quantity >= 20) return 5;
  return 0;
}

// realistický odhad hmotnosti modelu
function estimateGramsPerPart(
  volumeCm3: number,
  infillPct: number,
  material: Material
): number {
  const density = MATERIAL_DENSITY_G_PER_CM3[material];

  // efektívne percento výplne + obvodové steny/top/bottom
  const effectiveFillFactor = 0.18 + (infillPct / 100) * 0.42;
  const shellFactor = 1.08;

  const grams = volumeCm3 * density * effectiveFillFactor * shellFactor;

  return Math.max(1, grams);
}

// realistický odhad času tlače
function estimatePrintTimeMinPerPart(
  gramsPerPart: number,
  quality: Quality,
  infillPct: number
): number {
  // základ podľa hmotnosti
  const baseMinutes = gramsPerPart * 1.9;

  // vyšší infill = trochu viac času
  const infillFactor = 0.92 + infillPct / 1000;

  // kvalita vplýva na čas
  const qualityFactor =
    quality === "DRAFT" ? 0.9 : quality === "STANDARD" ? 1 : 1.15;

  const minutes = baseMinutes * infillFactor * qualityFactor;

  return Math.max(8, minutes);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function quote(input: QuoteInput): QuoteResult {
  const volumeCm3 = Number(input.volumeCm3);
  const material = input.material;
  const quality = input.quality;
  const infillPct = Number(input.infillPct);
  const quantity = Math.max(1, Number(input.quantity));

  const gramsPerPartRaw = estimateGramsPerPart(volumeCm3, infillPct, material);
  const printTimeMinPerPartRaw = estimatePrintTimeMinPerPart(
    gramsPerPartRaw,
    quality,
    infillPct
  );

  const materialCostPerPartRaw =
    gramsPerPartRaw * MATERIAL_PRICE_PER_GRAM[material];

  const machineCostPerPartRaw =
    (printTimeMinPerPartRaw / 60) * MACHINE_RATE_PER_HOUR[quality];

  const subtotalPerPartRaw =
    materialCostPerPartRaw + machineCostPerPartRaw;

  // tu je hlavná oprava:
  // cena za 1 kus sa normálne násobí počtom kusov
  const productionSubtotalRaw = subtotalPerPartRaw * quantity;

  const quantityDiscountPct = getQuantityDiscountPct(quantity);
  const quantityDiscountAmountRaw =
    productionSubtotalRaw * (quantityDiscountPct / 100);

  const totalRaw =
    SETUP_FEE + productionSubtotalRaw - quantityDiscountAmountRaw;

  return {
    gramsPerPart: round2(gramsPerPartRaw),
    printTimeMinPerPart: round2(printTimeMinPerPartRaw),
    materialCostPerPart: round2(materialCostPerPartRaw),
    machineCostPerPart: round2(machineCostPerPartRaw),
    subtotalPerPart: round2(subtotalPerPartRaw),

    setupFee: round2(SETUP_FEE),
    productionSubtotal: round2(productionSubtotalRaw),
    quantityDiscountPct,
    quantityDiscountAmount: round2(quantityDiscountAmountRaw),

    total: round2(totalRaw),
  };
}