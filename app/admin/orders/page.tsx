import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSafeServerSession } from "@/lib/session";
import { formatDateSK } from "@/lib/formatDate";
import AdminOrdersClient from "@/components/AdminOrdersClient";
import { colorLabel, materialLabel, qualityLabel } from "@/lib/print-options";

export const dynamic = "force-dynamic";

function getConfigLabel(config: any, modelCount: number) {
  if (!config || typeof config !== "object") return "—";

  const infill = typeof config.infillPct === "number" ? `${config.infillPct}% infill` : "—";
  const quantity = typeof config.quantity === "number" ? `${config.quantity} ks` : "—";

  const summary = [
    materialLabel(config.material),
    qualityLabel(config.quality),
    infill,
    colorLabel(config.color),
    quantity,
  ].join(" • ");

  const flags = [
    config.materialFlexible || config.colorFlexible ? "flexibilita −1€" : null,
    config.allowModelAdjustments ? "súhlas s úpravou" : null,
  ].filter(Boolean);
  const summaryWithFlags = flags.length > 0 ? `${summary} ⚠ ${flags.join(", ")}` : summary;

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

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

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
    modelCount: order._count.orderItems,
    models: getModels(order),
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
