export const COMPANY_INFO = {
  name: "4from media, s.r.o.",
  street: "Nezábudková 5",
  city: "Bratislava",
  zip: "821 01",
  country: "Slovensko",
  ico: "35976063",
  dic: "2022117966",
  icDph: "SK2022117966",
  // IBAN zo Tatra banky — over pred nasadením na produkciu
  iban: "SK35 1100 0000 0029 4526 7328",
  // SWIFT Tatra banky — over presný kód v internet bankingu alebo u banky
  swift: "TATRSKBX",
  bankName: "Tatra banka, a.s.",
};

// Extrahuje sekvenčné číslo z orderNumber "VYT-2026-0042" → "00000042"
export function generateVariableSymbol(orderNumber: string | null | undefined): string {
  if (!orderNumber) return String(Date.now()).slice(-8).padStart(8, "0");
  const parts = orderNumber.split("-");
  const seq = parseInt(parts[parts.length - 1] ?? "0", 10);
  if (!Number.isFinite(seq) || seq <= 0) return String(Date.now()).slice(-8);
  return String(seq).padStart(8, "0");
}
