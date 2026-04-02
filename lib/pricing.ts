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

const MACHINE_RATE_PER_HOUR: Record<Quality, number> = {
  DRAFT: 2.8,
  STANDARD: 3.1,
  FINE: 3.5,
};

const QUALITY_TIME_MULTIPLIER: Record<Quality, number> = {
  DRAFT: 0.88,
  STANDARD: 1,
  FINE: 1.18,
};

const SETUP_FEE = 10;

function getQuantityDiscountPct(quantity: number): number {
  if (quantity >= 100) return 15;
  if (quantity >= 50) return 10;
  if (quantity >= 20) return 5;
  return 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Kalibrácia podľa sliceru:
 * - nechceme počítať plný objem modelu
 * - chceme sa priblížiť reálnemu spotrebovanému filamentu
 *
 * Táto formula je nastavená tak, aby pri veľkých modeloch
 * a 10 % infille bola výrazne bližšie sliceru než pôvodná verzia.
 */
function estimateMaterialUsageRatio(infillPct: number): number {
  // základný pomer materiálu + rast podľa infillu
  const baseRatio = 0.05 + infillPct * 0.005;

  // korekcia na steny / top-bottom / realitu FDM tlače
  const calibratedRatio = baseRatio * 1.15;

  // bezpečnostné minimum, aby malé modely nepadali príliš nízko
  return Math.max(0.06, calibratedRatio);
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

/**
 * Kalibrácia času podľa reálneho sliceru:
 * - čas viažeme hlavne na hmotnosť
 * - nie na objem samotný
 *
 * 0.46 min / g vychádza výrazne bližšie k sliceru z tvojho príkladu.
 */
function estimatePrintTimeMinPerPart(
  gramsPerPart: number,
  quality: Quality
): number {
  const baseMinPerGram = 0.46;
  const qualityMultiplier = QUALITY_TIME_MULTIPLIER[quality];

  const minutes = gramsPerPart * baseMinPerGram * qualityMultiplier;

  return Math.max(5, minutes);
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
    quality
  );

  const materialCostPerPartRaw =
    gramsPerPartRaw * MATERIAL_PRICE_PER_GRAM[material];

  const machineCostPerPartRaw =
    (printTimeMinPerPartRaw / 60) * MACHINE_RATE_PER_HOUR[quality];

  const subtotalPerPartRaw =
    materialCostPerPartRaw + machineCostPerPartRaw;

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