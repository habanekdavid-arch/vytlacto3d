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
  PLA: 0.014,
  PETG: 0.0155,
  ABS: 0.0165,
  TPU: 0.018,
};

const MATERIAL_DENSITY_G_PER_CM3: Record<Material, number> = {
  PLA: 1.24,
  PETG: 1.27,
  ABS: 1.04,
  TPU: 1.21,
};

const MACHINE_RATE_PER_HOUR: Record<Quality, number> = {
  DRAFT: 3.4,
  STANDARD: 3.9,
  FINE: 4.5,
};

const QUALITY_TIME_MULTIPLIER: Record<Quality, number> = {
  DRAFT: 0.88,
  STANDARD: 1,
  FINE: 1.18,
};

const SETUP_FEE = 12;
const MAX_INFILL_PCT = 50;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getQuantityDiscountPct(quantity: number): number {
  if (quantity >= 100) return 15;
  if (quantity >= 50) return 10;
  if (quantity >= 20) return 5;
  return 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function estimateMaterialUsageRatio(infillPct: number): number {
  const safeInfill = clamp(infillPct, 5, MAX_INFILL_PCT);
  const baseRatio = 0.055 + safeInfill * 0.0056;
  const calibratedRatio = baseRatio * 1.18;

  return Math.max(0.07, calibratedRatio);
}

function estimateGramsPerPart(
  volumeCm3: number,
  infillPct: number,
  material: Material
): number {
  const density = MATERIAL_DENSITY_G_PER_CM3[material];
  const usageRatio = estimateMaterialUsageRatio(infillPct);
  const grams = volumeCm3 * density * usageRatio;

  return Math.max(1, grams);
}

function estimatePrintTimeMinPerPart(
  gramsPerPart: number,
  quality: Quality
): number {
  const baseMinPerGram = 0.52;
  const qualityMultiplier = QUALITY_TIME_MULTIPLIER[quality];
  const minutes = gramsPerPart * baseMinPerGram * qualityMultiplier;

  return Math.max(5, minutes);
}

export function quote(input: QuoteInput): QuoteResult {
  const volumeCm3 = Number(input.volumeCm3);
  const material = input.material;
  const quality = input.quality;
  const infillPct = clamp(Number(input.infillPct), 5, MAX_INFILL_PCT);
  const quantity = Math.max(1, Number(input.quantity));

  const gramsPerPartRaw = estimateGramsPerPart(volumeCm3, infillPct, material);
  const printTimeMinPerPartRaw = estimatePrintTimeMinPerPart(
    gramsPerPartRaw,
    quality
  );

  const materialCostPerPartRaw =
    gramsPerPartRaw * MATERIAL_PRICE_PER_GRAM[material];

  const machineCostPerPartRaw =
    (printTimeMinPerPartRaw / 60) * MACHINE_RATE_PER_HOUR[quality];

  const subtotalPerPartRaw = materialCostPerPartRaw + machineCostPerPartRaw;
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