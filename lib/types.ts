export type CartItemAnalysis = {
  dimsXmm: number;
  dimsYmm: number;
  dimsZmm: number;
  volumeCm3: number;
};

export type CartItemConfig = {
  material: "PLA" | "PETG" | "ABS";
  quality: "DRAFT" | "STANDARD" | "FINE";
  infillPct: number;
  color: string;
  quantity: number;
  scalePct: number;
  // Zákazníkovi nezáleží na presnom materiáli/farbe — za každú voľbu zľava.
  materialFlexible?: boolean;
  colorFlexible?: boolean;
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
  total: number;
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
