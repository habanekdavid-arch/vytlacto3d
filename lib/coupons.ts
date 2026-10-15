import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Jednorazové zľavové kupóny (5 / 10 / 20 % z ceny výroby, doprava sa
 * nezľavuje). Platba kartou kupón rezervuje (orderId) a použitý je až po
 * zaplatení; objednávka prevodom ho použije hneď. Rezervácia nezaplatenej
 * objednávky sa uvoľní, keď zákazník skúsi platiť znova (stará platobná
 * session sa vtedy zruší, aby kupón nešlo zaplatiť dvakrát).
 */

export const COUPON_PERCENTS = [5, 10, 20] as const;
export type CouponPercent = (typeof COUPON_PERCENTS)[number];

export function isCouponPercent(value: unknown): value is CouponPercent {
  return COUPON_PERCENTS.includes(Number(value) as CouponPercent);
}

// Bez znakov, ktoré sa dajú zameniť (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateCouponCode(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `VYT-${s.slice(0, 4)}-${s.slice(4)}`;
}

export function normalizeCouponCode(input: unknown): string {
  return String(input ?? "").toUpperCase().replace(/\s+/g, "").trim();
}

let tableReady: Promise<void> | null = null;

/** Tabuľka je v migrácii 20261015000000_add_coupon; založí sa aj sama. */
export function ensureCouponTable() {
  tableReady ??= (async () => {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Coupon" (
      "code" TEXT NOT NULL,
      "percent" INTEGER NOT NULL,
      "email" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdBy" TEXT,
      "sentAt" TIMESTAMP(3),
      "orderId" TEXT,
      "usedAt" TIMESTAMP(3),
      CONSTRAINT "Coupon_pkey" PRIMARY KEY ("code")
    )`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Coupon_email_idx" ON "Coupon"("email")`);
  })().catch((e) => {
    tableReady = null;
    throw e;
  });
  return tableReady;
}

export async function createCoupon(percent: CouponPercent, opts: { email?: string | null; createdBy?: string | null } = {}) {
  await ensureCouponTable();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCouponCode();
    try {
      return await prisma.coupon.create({
        data: { code, percent, email: opts.email?.trim().toLowerCase() || null, createdBy: opts.createdBy ?? null },
      });
    } catch (e: any) {
      if (e?.code !== "P2002") throw e; // kolízia kódu — skús iný
    }
  }
  throw new Error("Nepodarilo sa vygenerovať kupón.");
}

const RELEASABLE_STATUSES = new Set(["PENDING", "CANCELLED"]);

export type CouponCheck =
  | {
      ok: true;
      code: string;
      percent: number;
      /** orderId v kupóne tak, ako je zapísané (pre podmienený zápis). */
      holderOrderId: string | null;
      /** Nezaplatená objednávka, ktorá kupón drží (jej platbu treba zrušiť). */
      heldBy: { orderId: string; stripeSessionId: string | null; status: string } | null;
    }
  | { ok: false; error: string };

/** Dá sa kupón použiť? (nemení nič v databáze) */
export async function checkCoupon(rawCode: unknown): Promise<CouponCheck> {
  const code = normalizeCouponCode(rawCode);
  if (!code) return { ok: false, error: "Zadajte kód kupónu." };
  await ensureCouponTable();
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) return { ok: false, error: "Tento kupón neexistuje." };
  if (coupon.usedAt) return { ok: false, error: "Tento kupón už bol použitý." };

  let heldBy: { orderId: string; stripeSessionId: string | null; status: string } | null = null;
  if (coupon.orderId) {
    const order = await prisma.order.findUnique({
      where: { id: coupon.orderId },
      select: { id: true, status: true, stripeSessionId: true },
    });
    if (order && !RELEASABLE_STATUSES.has(order.status)) {
      // Objednávka je zaplatená — kupón je použitý (doplň, keby to ešte nebolo zapísané).
      await prisma.coupon.updateMany({ where: { code, usedAt: null }, data: { usedAt: new Date() } });
      return { ok: false, error: "Tento kupón už bol použitý." };
    }
    if (order) heldBy = { orderId: order.id, stripeSessionId: order.stripeSessionId, status: order.status };
  }
  return { ok: true, code, percent: coupon.percent, holderOrderId: coupon.orderId, heldBy };
}

/**
 * Zapíše zľavu do ceny jednej položky. Celá ďalšia cesta (Stripe, faktúra,
 * e-maily, FLOWii) pracuje s `total`, takže zľava sa prenesie všade.
 */
export function applyCouponToPricing<T extends { total: number }>(pricing: T, code: string, percent: number) {
  const before = pricing.total;
  const discount = Math.round(before * percent) / 100;
  return {
    ...pricing,
    total: Math.round((before - discount) * 100) / 100,
    totalBeforeCoupon: before,
    couponCode: code,
    couponPercent: percent,
    couponDiscountEur: discount,
  };
}

/**
 * Pridelí kupón objednávke. Podmienené zápisom, aby ho dve súčasné
 * objednávky nemohli získať naraz. used = objednávka prevodom (hneď použitý).
 */
export async function claimCoupon(code: string, orderId: string, previousOrderId: string | null, used: boolean) {
  const res = await prisma.coupon.updateMany({
    where: { code, usedAt: null, orderId: previousOrderId },
    data: { orderId, ...(used ? { usedAt: new Date() } : {}) },
  });
  return res.count === 1;
}

/** Po zaplatení kartou: kupón objednávky je definitívne použitý. */
export async function markCouponUsedForOrder(orderId: string) {
  try {
    await ensureCouponTable();
    await prisma.coupon.updateMany({ where: { orderId, usedAt: null }, data: { usedAt: new Date() } });
  } catch (e) {
    console.error("markCouponUsedForOrder failed:", orderId, e);
  }
}
