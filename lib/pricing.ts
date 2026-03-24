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
  total: number;
};

type MaterialSpec = {
  densityGcm3: number;
  filamentCostPerGram: number;
  machineRatePerHour: number;
};

const MATERIALS: Record<MaterialId, MaterialSpec> = {
  PLA: {
    densityGcm3: 1.24,
    filamentCostPerGram: 0.012,
    machineRatePerHour: 3.0,
  },
  PETG: {
    densityGcm3: 1.27,
    filamentCostPerGram: 0.013,
    machineRatePerHour: 3.2,
  },
  ABS: {
    densityGcm3: 1.04,
    filamentCostPerGram: 0.014,
    machineRatePerHour: 3.5,
  },
  TPU: {
    densityGcm3: 1.2,
    filamentCostPerGram: 0.015,
    machineRatePerHour: 3.8,
  },
};

const QUALITY_TIME_MULTIPLIER: Record<QualityId, number> = {
  DRAFT: 0.9,
  STANDARD: 1,
  FINE: 1.18,
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Reálny podiel plastu voči plnému objemu modelu pre FDM:
 * - zahŕňa steny + top/bottom + sparse infill
 * - kalibrácia je nastavená tak, aby pri 10 % infille vyšla hodnota
 *   veľmi blízko slicer výsledku, ktorý si poslal
 */
function getPrintedVolumeFraction(infillPct: number) {
  const clamped = clamp(infillPct, 5, 70);

  // 10 % -> cca 0.11
  // 20 % -> cca 0.15
  // 35 % -> cca 0.21
  // 50 % -> cca 0.27
  // 70 % -> cca 0.35
  return 0.07 + clamped * 0.004;
}

/**
 * Kalibrácia času podľa reálneho sliceru:
 * približne 0.476 min / g pri 1.0 mm tryske a 0.6 mm vrstve.
 */
function getMinutesPerGram(quality: QualityId) {
  return 0.476 * QUALITY_TIME_MULTIPLIER[quality];
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

  // malý odpad a rezervy
  const gramsPerPart = round2(gramsPerPartRaw * 1.005);
  const printTimeMinPerPart = round2(printTimeMinPerPartRaw);

  const materialCostPerPart = round2(gramsPerPart * material.filamentCostPerGram);
  const machineCostPerPart = round2((printTimeMinPerPart / 60) * material.machineRatePerHour);

  const subtotalPerPart = round2(materialCostPerPart + machineCostPerPart);
  const total = round2(subtotalPerPart * quantity);

  return {
    gramsPerPart,
    printTimeMinPerPart,
    materialCostPerPart,
    machineCostPerPart,
    subtotalPerPart,
    total,
  };
}