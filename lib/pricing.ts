export type MaterialId = "PLA" | "PETG" | "ABS" | "TPU";
export type QualityId = "DRAFT" | "STANDARD" | "FINE";

export type QuoteInput = {
  volumeCm3: number;
  material: MaterialId;
  quality: QualityId;
  infillPct: number;
  quantity: number;
};

export type QuoteResult = {
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

type MaterialSpec = {
  densityGcm3: number;
  filamentCostPerGram: number;
};

const MATERIALS: Record<MaterialId, MaterialSpec> = {
  PLA: {
    densityGcm3: 1.24,
    filamentCostPerGram: 0.012,
  },
  PETG: {
    densityGcm3: 1.27,
    filamentCostPerGram: 0.013,
  },
  ABS: {
    densityGcm3: 1.04,
    filamentCostPerGram: 0.014,
  },
  TPU: {
    densityGcm3: 1.2,
    filamentCostPerGram: 0.015,
  },
};

const MACHINE_RATE_PER_HOUR: Record<QualityId, number> = {
  DRAFT: 2.8,
  STANDARD: 3.1,
  FINE: 3.5,
};

const QUALITY_TIME_MULTIPLIER: Record<QualityId, number> = {
  DRAFT: 0.88,
  STANDARD: 1,
  FINE: 1.18,
};

const SETUP_FEE_PER_MODEL = 10;

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getPrintedVolumeFraction(infillPct: number) {
  const clamped = clamp(infillPct, 5, 70);
  return 0.075 + clamped * 0.0035;
}

function getMinutesPerGram(quality: QualityId) {
  return 0.48 * QUALITY_TIME_MULTIPLIER[quality];
}

function getQuantityDiscountPct(quantity: number) {
  if (quantity >= 100) return 15;
  if (quantity >= 50) return 10;
  if (quantity >= 20) return 5;
  return 0;
}

export function quote(input: QuoteInput): QuoteResult {
  const volumeCm3 = Number(input.volumeCm3);
  const quantity = Number(input.quantity);
  const infillPct = Number(input.infillPct);

  if (!Number.isFinite(volumeCm3) || volumeCm3 <= 0) {
    throw new Error("Invalid volumeCm3");
  }

  if (!Number.isFinite(quantity) || quantity < 1) {
    throw new Error("Invalid quantity");
  }

  if (!Number.isFinite(infillPct) || infillPct < 0 || infillPct > 100) {
    throw new Error("Invalid infillPct");
  }

  const material = MATERIALS[input.material];
  if (!material) {
    throw new Error("Unsupported material");
  }

  const printedVolumeFraction = getPrintedVolumeFraction(infillPct);
  const printedVolumeCm3 = volumeCm3 * printedVolumeFraction;

  const gramsPerPartRaw = printedVolumeCm3 * material.densityGcm3;
  const printTimeMinPerPartRaw = gramsPerPartRaw * getMinutesPerGram(input.quality);

  const gramsPerPart = round2(gramsPerPartRaw * 1.005);
  const printTimeMinPerPart = round2(printTimeMinPerPartRaw);

  const materialCostPerPart = round2(
    gramsPerPart * material.filamentCostPerGram
  );

  const machineCostPerPart = round2(
    (printTimeMinPerPart / 60) * MACHINE_RATE_PER_HOUR[input.quality]
  );

  const subtotalPerPart = round2(materialCostPerPart + machineCostPerPart);

  const productionSubtotal = round2(subtotalPerPart * quantity);

  const quantityDiscountPct = getQuantityDiscountPct(quantity);
  const quantityDiscountAmount = round2(
    productionSubtotal * (quantityDiscountPct / 100)
  );

  const total = round2(
    Math.max(
      SETUP_FEE_PER_MODEL,
      SETUP_FEE_PER_MODEL + productionSubtotal - quantityDiscountAmount
    )
  );

  return {
    gramsPerPart,
    printTimeMinPerPart,
    materialCostPerPart,
    machineCostPerPart,
    subtotalPerPart,

    setupFee: SETUP_FEE_PER_MODEL,
    productionSubtotal,
    quantityDiscountPct,
    quantityDiscountAmount,

    total,
  };
}