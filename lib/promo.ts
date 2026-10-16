/**
 * Časovo obmedzená akcia na celý web (lišta s odpočtom + zľava v cene).
 * Zľava sa počíta v quote() — teda v kalkulačke, košíku aj na serveri pri
 * objednávke (Stripe, faktúra, e-maily). Po `endsAt` sa sama vypne.
 * Novú akciu nastavíš zmenou týchto hodnôt (endsAt so slovenským časovým
 * pásmom: +02:00 letný čas, +01:00 zimný).
 */
export const PROMO = {
  percent: 10,
  startsAt: "2026-10-16T00:00:00+02:00",
  endsAt: "2026-10-18T23:59:59+02:00",
};

export type ActivePromo = { percent: number; endsAt: string };

export function activePromo(now: Date = new Date()): ActivePromo | null {
  const t = now.getTime();
  if (t < Date.parse(PROMO.startsAt) || t > Date.parse(PROMO.endsAt)) return null;
  return { percent: PROMO.percent, endsAt: PROMO.endsAt };
}
