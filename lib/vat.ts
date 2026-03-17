export const VAT_MULTIPLIER = 1.23;

export function addVat(priceWithoutVat: number): number {
  if (!Number.isFinite(priceWithoutVat)) return 0;
  return Math.round(priceWithoutVat * VAT_MULTIPLIER * 100) / 100;
}

export function formatEur(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${value.toFixed(2).replace(".", ",")} €`;
}

export function formatPriceWithVat(priceWithoutVat: number | null | undefined) {
  if (typeof priceWithoutVat !== "number" || Number.isNaN(priceWithoutVat)) {
    return "—";
  }

  return formatEur(addVat(priceWithoutVat));
}

export function formatPricePair(priceWithoutVat: number | null | undefined) {
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