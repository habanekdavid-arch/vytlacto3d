import { addVat } from "./vat";

// Interné ceny dopravy BEZ DPH
export const SHIPPING_RATES_WITHOUT_VAT = {
  PACKETA: 3.99,
  COURIER: 5.99,
} as const;

// Finálne ceny dopravy S DPH 23% — zobrazovať zákazníkovi a použiť v Stripe
export const SHIPPING_RATES_WITH_VAT = {
  PACKETA: addVat(SHIPPING_RATES_WITHOUT_VAT.PACKETA), // 4.91 €
  COURIER: addVat(SHIPPING_RATES_WITHOUT_VAT.COURIER),  // 7.37 €
} as const;
