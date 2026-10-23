export type CartItemAnalysis = {
  dimsXmm: number;
  dimsYmm: number;
  dimsZmm: number;
  volumeCm3: number;
  /** Povrch a odhad podpier — chýbajú pri modeloch nahratých pred ich zavedením. */
  surfaceAreaCm2?: number;
  supportCm3?: number;
  printHeightMm?: number;
};

export type CartItemConfig = {
  material: "PLA" | "PETG" | "ABS" | "PA6-CF";
  quality: "DRAFT" | "STANDARD" | "FINE";
  infillPct: number;
  color: string;
  quantity: number;
  scalePct: number;
  // Zákazníkovi nezáleží na presnom materiáli/farbe — za každú voľbu zľava.
  materialFlexible?: boolean;
  colorFlexible?: boolean;
  /**
   * Viacfarebná tlač: farba každej časti modelu (poradie podľa
   * lib/model-parts — od najväčšej časti). Chýba = jedna farba `color`.
   */
  partColors?: string[];
};

export type CartItemPricing = {
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
  /** Poplatok za viacfarebnú tlač (bez DPH); staršie položky ho nemajú. */
  multicolorFee?: number;
  modelFee?: number;
  total: number;
  /** Len počas akcie (lib/promo). */
  promoPercent?: number;
  promoDiscountEur?: number;
  totalBeforePromo?: number;
};

export type CartItem = {
  id: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  analysis: CartItemAnalysis;
  config: CartItemConfig;
  pricing: CartItemPricing | null;
};
