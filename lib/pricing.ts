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

/**
 * Geometria modelu z /api/analyze (v mierke 100 %). Povrch a podpery majú
 * len modely nahraté po zavedení presnejšieho výpočtu — staršie položky
 * v košíku ich nemajú a dopočítajú sa odhadom.
 */
export type ModelGeometry = {
  volumeCm3: number;
  surfaceAreaCm2?: number;
  supportCm3?: number;
  dimsZmm?: number;
};

/** Geometria po zmene mierky: objem ×s³, povrch ×s², výška ×s. */
export function scaledGeometry(analysis: ModelGeometry, scalePct: number) {
  const s = (Number(scalePct) || 100) / 100;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined);
  const area = num(analysis.surfaceAreaCm2);
  const support = num(analysis.supportCm3);
  const height = num(analysis.dimsZmm);
  return {
    volumeCm3: Number(analysis.volumeCm3) * s ** 3,
    surfaceAreaCm2: area === undefined ? undefined : area * s ** 2,
    supportCm3: support === undefined ? undefined : support * s ** 3,
    heightMm: height === undefined ? undefined : height * s,
  };
}

type QuoteInput = {
  volumeCm3: number;
  /** Povrch modelu (cm²) — určuje, koľko materiálu ide do plných stien. */
  surfaceAreaCm2?: number;
  /** Odhad objemu pod prevismi (cm³) — z neho sa počítajú podpery. */
  supportCm3?: number;
  /** Výška modelu pri tlači (mm) — počet vrstiev. */
  heightMm?: number;
  material: Material;
  quality: Quality;
  infillPct: number;
  quantity: number;
  // Zákazníkovi nezáleží na presnom materiáli/farbe — dovoľuje nám doplniť,
  // čím máme práve poruke. Každá z nich je vlastná zľava.
  materialFlexible?: boolean;
  colorFlexible?: boolean;
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
  flexibleDiscountEur: number;
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

/**
 * Model spotreby materiálu a času tlače, nakalibrovaný sliceroch na
 * nastaveniach z oficiálnych profilov Bambu Studio pre P1S/X1C s tryskou 0,4
 * (Rýchla = 0,28 mm Extra Draft, Štandard = 0,20 mm Standard, Detailná =
 * 0,12 mm Fine; stromové podpery) na 37 rôznych modeloch × kvalita × výplň
 * × materiál. Odchýlka oproti sliceru (medián): hmotnosť ~2–3 %, čas ~13 %
 * pri PLA/ABS, ~25 % pri PETG. Pôvodný odhad podhodnocoval hmotnosť o ~25 %
 * a čas o ~70 %.
 *
 *  - shellCm:       hrúbka plných stien + horných/spodných vrstiev (cm), takže
 *                   plášť = povrch × shellCm (najviac celý objem modelu),
 *  - infillFactor:  koľko materiálu ide do vnútra pri danom % výplne,
 *  - supportFactor: podiel objemu pod prevismi, ktorý zaberú podpery,
 *  - čas (min) = base + perLayer × vrstvy + (shell × plášť + infill × výplň
 *                + support × podpery) × rýchlosť materiálu.
 */
const PRINT_MODEL: Record<
  Quality,
  {
    layerMm: number;
    shellCm: number;
    infillFactor: number;
    supportFactor: number;
    minBase: number;
    minPerLayer: number;
    minPerShellCm3: number;
    minPerInfillCm3: number;
    minPerSupportCm3: number;
  }
> = {
  DRAFT:    { layerMm: 0.28, shellCm: 0.0905, infillFactor: 1.017, supportFactor: 0.100, minBase: 1.66, minPerLayer: 0.0385, minPerShellCm3: 1.217, minPerInfillCm3: 1.110, minPerSupportCm3: 4.585 },
  STANDARD: { layerMm: 0.20, shellCm: 0.0884, infillFactor: 1.012, supportFactor: 0.104, minBase: 2.29, minPerLayer: 0.0405, minPerShellCm3: 1.388, minPerInfillCm3: 1.244, minPerSupportCm3: 5.882 },
  FINE:     { layerMm: 0.12, shellCm: 0.0851, infillFactor: 1.012, supportFactor: 0.113, minBase: 3.14, minPerLayer: 0.0456, minPerShellCm3: 1.807, minPerInfillCm3: 1.695, minPerSupportCm3: 9.137 },
};

// PETG sa tlačí pomalšie ako PLA (nižší prietok, chladenie); ABS na Bambu
// približne rovnako rýchlo ako PLA.
const MATERIAL_TIME_FACTOR: Record<Material, number> = {
  PLA:  1.0,
  PETG: 1.6,
  ABS:  1.0,
};

// Najmenší možný povrch telesa daného objemu má guľa: (36π)^(1/3) · V^(2/3).
const SPHERE_AREA_FACTOR = Math.cbrt(36 * Math.PI);

// Základný poplatok za objednávku (nastavenie stroja, slicing, kontrola)
const SETUP_FEE = 10;

// Zľava za každú "nezáleží mi" voľbu (materiál / farba) — € na model, bez DPH.
const FLEXIBLE_DISCOUNT_EUR = 1;

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

  // Geometria: modely bez povrchu/výšky (staršie položky v košíku) dostanú
  // odhad ako kocka rovnakého objemu. Povrch nikdy menší ako má guľa —
  // menší by fyzikálne nebol možný.
  const minAreaCm2 = SPHERE_AREA_FACTOR * Math.pow(volumeCm3, 2 / 3);
  const areaInput = Number(input.surfaceAreaCm2);
  const surfaceAreaCm2 = Math.max(
    minAreaCm2,
    Number.isFinite(areaInput) && areaInput > 0 ? areaInput : 6 * Math.pow(volumeCm3, 2 / 3)
  );
  const heightInput = Number(input.heightMm);
  const heightMm =
    Number.isFinite(heightInput) && heightInput > 0 ? heightInput : Math.cbrt(volumeCm3) * 10;
  const supportInput = Number(input.supportCm3);
  const supportColumnCm3 = Number.isFinite(supportInput) && supportInput > 0 ? supportInput : 0;

  const pm = PRINT_MODEL[quality];
  const shellCm3 = Math.min(volumeCm3, surfaceAreaCm2 * pm.shellCm);
  const infillCm3 = Math.max(0, volumeCm3 - surfaceAreaCm2 * pm.shellCm) * (infillPct / 100) * pm.infillFactor;
  const supportCm3 = supportColumnCm3 * pm.supportFactor;

  // Hmotnosť: skutočne vytlačený objem (plášť + výplň + podpery) × hustota
  const gramsPerPartRaw = (shellCm3 + infillCm3 + supportCm3) * MATERIAL_DENSITY_G_PER_CM3[material];

  // Čas tlače: príprava + vrstvy + vytláčanie jednotlivých častí
  const layers = heightMm / pm.layerMm;
  const printTimeMinPerPartRaw = Math.max(
    5,
    pm.minBase +
      pm.minPerLayer * layers +
      MATERIAL_TIME_FACTOR[material] *
        (pm.minPerShellCm3 * shellCm3 + pm.minPerInfillCm3 * infillCm3 + pm.minPerSupportCm3 * supportCm3)
  );

  // Náklady na materiál a stroj
  const materialCostPerPartRaw = gramsPerPartRaw * MATERIAL_PRICE_PER_GRAM[material];
  const machineCostPerPartRaw  = (printTimeMinPerPartRaw / 60) * MACHINE_RATE_PER_HOUR[quality];
  const subtotalPerPartRaw     = materialCostPerPartRaw + machineCostPerPartRaw;

  const productionSubtotalRaw     = subtotalPerPartRaw * quantity;
  const quantityDiscountPct       = getQuantityDiscountPct(quantity);
  const quantityDiscountAmountRaw = productionSubtotalRaw * (quantityDiscountPct / 100);

  // Minimálna celková cena objednávky = SETUP_FEE (10 €)
  const totalBeforeFlexibleDiscountRaw = Math.max(
    SETUP_FEE,
    SETUP_FEE + productionSubtotalRaw - quantityDiscountAmountRaw
  );

  const flexibleDiscountRequestedRaw =
    (input.materialFlexible ? FLEXIBLE_DISCOUNT_EUR : 0) +
    (input.colorFlexible ? FLEXIBLE_DISCOUNT_EUR : 0);

  // Zľava nikdy nezje základný poplatok za spracovanie objednávky.
  const flexibleDiscountRaw = Math.min(
    flexibleDiscountRequestedRaw,
    Math.max(0, totalBeforeFlexibleDiscountRaw - SETUP_FEE)
  );

  const totalRaw = totalBeforeFlexibleDiscountRaw - flexibleDiscountRaw;

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
    flexibleDiscountEur:    round2(flexibleDiscountRaw),
    total:                  round2(totalRaw),
  };
}
