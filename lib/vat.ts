export const VAT_RATE = 0.23;
export const VAT_MULTIPLIER = 1 + VAT_RATE;

export function vatAmount(priceWithoutVat: number): number {
  if (!Number.isFinite(priceWithoutVat)) return 0;
  return Math.round(priceWithoutVat * VAT_RATE * 100) / 100;
}

export function addVat(priceWithoutVat: number): number {
  if (!Number.isFinite(priceWithoutVat)) return 0;
  return Math.round(priceWithoutVat * VAT_MULTIPLIER * 100) / 100;
}

export function formatEur(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${value.toFixed(2).replace(".", ",")} €`;
}

export function formatPriceWithoutVat(
  priceWithoutVat: number | null | undefined
) {
  if (typeof priceWithoutVat !== "number" || Number.isNaN(priceWithoutVat)) {
    return "—";
  }

  return formatEur(priceWithoutVat);
}

export function formatPriceWithVat(
  priceWithoutVat: number | null | undefined
) {
  if (typeof priceWithoutVat !== "number" || Number.isNaN(priceWithoutVat)) {
    return "—";
  }

  return formatEur(addVat(priceWithoutVat));
}

// Formátuje sumu, ktorá JUŽ obsahuje DPH (napr. paidTotalEur zo Stripe).
// Nesmie volať addVat() — DPH je v sume zahrnutá.
export function formatPaidTotal(paidWithVat: number | null | undefined): string {
  if (typeof paidWithVat !== "number" || !Number.isFinite(paidWithVat)) return "—";
  return `${formatEur(paidWithVat)} s DPH`;
}

export function formatPricePair(
  priceWithoutVat: number | null | undefined
) {
  if (typeof priceWithoutVat !== "number" || Number.isNaN(priceWithoutVat)) {
    return {
      withoutVat: "—",
      withVat: "—",
    };
  }

  return {
    withoutVat: formatEur(priceWithoutVat),
    withVat: formatEur(addVat(priceWithoutVat)),
  };
}