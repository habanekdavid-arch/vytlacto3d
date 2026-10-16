/**
 * Časovo obmedzená akcia na celý web (lišta s odpočtom + zľava v cene).
 * Zľava sa počíta v quote() — teda v kalkulačke, košíku aj na serveri pri
 * objednávke (Stripe, faktúra, e-maily). Po `endsAt` sa sama vypne.
 * Novú akciu nastavíš zmenou týchto hodnôt (endsAt so slovenským časovým
 * pásmom: +02:00 letný čas, +01:00 zimný).
 */
export const PROMO = {
  percent: 15,
  startsAt: "2026-10-16T00:00:00+02:00",
  endsAt: "2026-10-23T23:59:59+02:00",
  /** Vzhľad bannera: "halloween" = fialovo-oranžový s grafikou, inak čierna lišta. */
  theme: "halloween" as "halloween" | "default",
};

export type ActivePromo = { percent: number; endsAt: string; theme: "halloween" | "default" };

export function activePromo(now: Date = new Date()): ActivePromo | null {
  const t = now.getTime();
  if (t < Date.parse(PROMO.startsAt) || t > Date.parse(PROMO.endsAt)) return null;
  return { percent: PROMO.percent, endsAt: PROMO.endsAt, theme: PROMO.theme };
}
