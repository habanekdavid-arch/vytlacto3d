import { prisma } from "@/lib/prisma";
import { getPacketaSender, type PacketAttributes } from "@/lib/packeta/client";

/**
 * Zásielka Packeta vytvorená k objednávke. Samostatná tabuľka (ako
 * FlowiiSync), aby sa nemenila tabuľka Order. orderId ako primárny kľúč =
 * k objednávke vznikne najviac jedna zásielka a štítok sa dá stiahnuť znova.
 */
const ENSURE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS "PacketaShipment" (
    "orderId" TEXT NOT NULL,
    "packetId" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "barcodeText" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PacketaShipment_pkey" PRIMARY KEY ("orderId")
)`;

let tableReady: Promise<void> | null = null;

export function ensurePacketaTable(): Promise<void> {
  if (!tableReady) {
    tableReady = prisma.$executeRawUnsafe(ENSURE_TABLE_SQL).then(
      () => undefined,
      (e) => {
        tableReady = null;
        throw e;
      }
    );
  }
  return tableReady;
}

export async function getPacketaShipment(orderId: string) {
  await ensurePacketaTable();
  return prisma.packetaShipment.findUnique({ where: { orderId } });
}

/** Objednávky, ku ktorým sa dá vytvoriť zásielka (zaplatené a ďalej). */
export const PACKETA_READY_STATUSES = ["PAID", "IN_PRODUCTION", "SHIPPED", "DELIVERED"];

// Predvolené rozmery balíka (cm) — podľa bežne používanej krabice.
export const DEFAULT_PARCEL_CM = { length: 23, width: 15, height: 7 };
// Obal a výplň navyše k hmotnosti výtlačkov.
const PACKAGING_KG = 0.15;

type OrderForPacket = {
  id: string;
  orderNumber: string | null;
  status: string;
  customerEmail: string | null;
  phone: string | null;
  contactPerson: string | null;
  paidTotalEur: number | null;
  pricing: unknown;
  config: unknown;
  deliveryAddress: unknown;
  shippingAddress: unknown;
  user?: { name: string | null } | null;
  orderItems?: { pricing: unknown; config: unknown }[];
};

export type PacketDraft = {
  ready: boolean;
  isPacketa: boolean;
  pointId: string | null;
  pointName: string | null;
  number: string;
  recipient: string;
  email: string | null;
  phone: string | null;
  valueEur: number;
  weightKg: number;
  warnings: string[];
};

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

/** Odhad hmotnosti balíka: výtlačky (gramy z kalkulácie × kusy) + obal. */
function estimateWeightKg(order: OrderForPacket): number {
  const items = order.orderItems?.length ? order.orderItems : [{ pricing: order.pricing, config: order.config }];
  let grams = 0;
  for (const item of items) {
    const g = num(rec(item.pricing).gramsPerPart) ?? 0;
    const qty = num(rec(item.config).quantity) ?? 1;
    grams += g * Math.max(1, qty);
  }
  return Math.max(0.1, Math.ceil((grams / 1000 + PACKAGING_KG) * 10) / 10);
}

export function buildPacketDraft(order: OrderForPacket): PacketDraft {
  const delivery = rec(order.deliveryAddress);
  const shipping = rec(order.shippingAddress);
  const isPacketa = delivery.type === "packeta";
  const pointId = str(delivery.packetaPointId);
  const recipient =
    str(shipping.name) ?? str(order.user?.name) ?? str(order.contactPerson) ?? str(delivery.contact) ?? "";
  const email = str(order.customerEmail);
  const phone = str(order.phone) ?? str(shipping.phone);
  const pricing = rec(order.pricing);
  const valueEur = num(order.paidTotalEur) ?? (num(pricing.total) !== null ? Math.round(num(pricing.total)! * 1.23 * 100) / 100 : 0);

  const warnings: string[] = [];
  if (!isPacketa) warnings.push("Objednávka nie je na výdajné miesto Packeta (doprava kuriérom).");
  else if (!pointId) warnings.push("Pri objednávke chýba ID výdajného miesta Packeta.");
  if (!recipient) warnings.push("Chýba meno príjemcu.");
  if (!email && !phone) warnings.push("Chýba e-mail aj telefón príjemcu — Packeta ho nebude vedieť upozorniť.");
  if (!PACKETA_READY_STATUSES.includes(order.status)) warnings.push("Objednávka ešte nie je zaplatená.");

  return {
    ready: isPacketa && !!pointId && !!recipient && (!!email || !!phone),
    isPacketa,
    pointId,
    pointName: str(delivery.packetaPointName),
    number: order.orderNumber ?? order.id,
    recipient,
    email,
    phone,
    valueEur,
    weightKg: estimateWeightKg(order),
    warnings,
  };
}

export function packetAttributesFromDraft(
  draft: PacketDraft,
  parcel: { weightKg: number; lengthCm: number; widthCm: number; heightCm: number }
): PacketAttributes {
  const parts = draft.recipient.split(/\s+/).filter(Boolean);
  const name = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0] ?? "";
  const surname = parts.length > 1 ? parts[parts.length - 1] : parts[0] ?? "";
  return {
    number: draft.number,
    name,
    surname,
    email: draft.email,
    phone: draft.phone,
    addressId: draft.pointId ?? "",
    value: Math.max(0.01, draft.valueEur),
    currency: "EUR",
    weight: parcel.weightKg,
    eshop: getPacketaSender(),
    size: { length: parcel.lengthCm * 10, width: parcel.widthCm * 10, height: parcel.heightCm * 10 },
  };
}
