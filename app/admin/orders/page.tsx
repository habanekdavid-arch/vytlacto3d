import { redirect } from "next/navigation";
import { activeAdminEmails } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getSafeServerSession } from "@/lib/session";
import { formatDateSK } from "@/lib/formatDate";
import AdminOrdersClient from "@/components/AdminOrdersClient";
import { ensurePacketaTable } from "@/lib/packeta/shipment";
import { colorSummary, materialLabel, qualityLabel } from "@/lib/print-options";

export const dynamic = "force-dynamic";

function getConfigLabel(config: any, modelCount: number) {
  if (!config || typeof config !== "object") return "—";

  const infill = typeof config.infillPct === "number" ? `${config.infillPct}% infill` : "—";
  const quantity = typeof config.quantity === "number" ? `${config.quantity} ks` : "—";

  const summary = [
    materialLabel(config.material),
    qualityLabel(config.quality),
    infill,
    colorSummary(config),
    quantity,
  ].join(" • ");

  const summaryWithFlags =
    config.materialFlexible || config.colorFlexible
      ? `${summary} ⚠ flexibilita −1€`
      : summary;

  // Objednávka nesie nastavenia len prvého modelu. Pri viacerých by to bez
  // označenia vyzeralo ako nastavenie celej objednávky.
  return modelCount > 1 ? `1. model: ${summaryWithFlags}` : summaryWithFlags;
}

/**
 * Modely pre náhľad priamo v prehľade objednávok.
 *
 * Staršie objednávky nemajú položky v `orderItems` — vtedy je jediný model
 * zapísaný priamo na objednávke.
 */
function getModels(order: {
  fileKey: string;
  fileName: string;
  config: unknown;
  orderItems: { fileKey: string; fileName: string; config: unknown }[];
}) {
  const source =
    order.orderItems.length > 0
      ? order.orderItems
      : [{ fileKey: order.fileKey, fileName: order.fileName, config: order.config }];

  return source
    .filter((item) => Boolean(item.fileKey))
    .map((item) => {
      const config = (item.config ?? {}) as Record<string, unknown>;

      return {
        fileKey: item.fileKey,
        fileName: item.fileName,
        scalePct: typeof config.scalePct === "number" ? config.scalePct : 100,
        colorId: typeof config.color === "string" ? config.color : "black",
      };
    });
}

export default async function AdminOrdersPage() {
  const session = await getSafeServerSession();
  const sessionUser = session?.user as { email?: string | null } | undefined;

  const adminEmails = await activeAdminEmails();

  const userEmail = String(sessionUser?.email ?? "").toLowerCase();

  if (!userEmail || !adminEmails.includes(userEmail)) {
    redirect("/");
  }

  const ordersRaw = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { orderItems: true } },
      // Len toľko, koľko potrebuje náhľad modelu priamo v prehľade.
      orderItems: {
        orderBy: { createdAt: "asc" },
        select: { fileKey: true, fileName: true, config: true },
      },
    },
  });

  // Zásielky Packeta k objednávkam v zozname — pre ikonku so stavom štítku.
  await ensurePacketaTable();
  const packetaShipments = await prisma.packetaShipment.findMany({
    where: { orderId: { in: ordersRaw.map((o) => o.id) } },
    select: { orderId: true, barcodeText: true },
  });
  const packetaByOrder = new Map(packetaShipments.map((p) => [p.orderId, p.barcodeText]));

  const orders = ordersRaw.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber ?? null,
    fileName: order.fileName,
    fileKey: order.fileKey,
    status: order.status,
    customerEmail: order.customerEmail ?? "—",
    shippingMethod: order.shippingMethod ?? "—",
    stripeSessionId: order.stripeSessionId ?? null,
    paidTotalEur: order.paidTotalEur ?? null,
    createdAtText: formatDateSK(order.createdAt),
    configLabel: getConfigLabel(order.config, order._count.orderItems),
    allowModelAdjustments: Boolean((order.config as Record<string, unknown> | null)?.allowModelAdjustments),
    modelCount: order._count.orderItems,
    models: getModels(order),
    isPacketa: Boolean(
      (order.deliveryAddress as Record<string, unknown> | null)?.type === "packeta" ||
        (order.deliveryAddress as Record<string, unknown> | null)?.packetaPointId
    ),
    packetaBarcodeText: packetaByOrder.get(order.id) ?? null,
  }));

  // paidTotalEur je zo Stripe — už obsahuje DPH, sčítame priamo
  const revenueTotal = ordersRaw.reduce(
    (s, o) => s + (typeof o.paidTotalEur === "number" ? o.paidTotalEur : 0),
    0
  );

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "PENDING").length,
    awaitingTransfer: orders.filter((o) => o.status === "AWAITING_TRANSFER").length,
    paid: orders.filter((o) => o.status === "PAID").length,
    inProduction: orders.filter((o) => o.status === "IN_PRODUCTION").length,
    shipped: orders.filter((o) => o.status === "SHIPPED").length,
    delivered: orders.filter((o) => o.status === "DELIVERED").length,
    cancelled: orders.filter((o) => o.status === "CANCELLED").length,
    revenueTotal,
  };

  return <AdminOrdersClient orders={orders} stats={stats} />;
}
