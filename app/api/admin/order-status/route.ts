import { NextRequest, NextResponse } from "next/server";
import { getSafeServerSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { sendOrderStatusEmail } from "@/lib/email-status";
import { sendOrderPaidEmail } from "@/lib/email";
import { scheduleFlowiiSync } from "@/lib/flowii/sync";

const VALID_STATUSES = [
  "PENDING",
  "AWAITING_TRANSFER",
  "PAID",
  "IN_PRODUCTION",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

export async function POST(req: NextRequest) {
  const session = await getSafeServerSession();
  const userEmail = String((session?.user as any)?.email ?? "").toLowerCase();
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!userEmail || !adminEmails.includes(userEmail)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId, status } = await req.json();

  if (!orderId || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Neplatné dáta." }, { status: 400 });
  }

  const previousOrder = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status },
  });

  // Payment just got confirmed (e.g. admin manually confirming a bank
  // transfer) — send the same detailed "order paid" email card customers
  // get via the Stripe webhook, not just the generic status-change email.
  const justGotPaid = status === "PAID" && previousOrder?.status !== "PAID";

  // Zákazka vo FLOWii vzniká pri prvom prechode do zaplateného stavu — aj keď
  // administrátor preskočí PAID a dá objednávku rovno do výroby.
  const PAID_STATES = ["PAID", "IN_PRODUCTION", "SHIPPED", "DELIVERED"];
  if (PAID_STATES.includes(status) && !PAID_STATES.includes(previousOrder?.status ?? "")) {
    scheduleFlowiiSync(order.id);
  }

  if (order.customerEmail) {
    try {
      if (justGotPaid) {
        const shippingCostEur =
          typeof (order.shippingCost as any)?.amount === "number"
            ? (order.shippingCost as any).amount / 100
            : null;

        await sendOrderPaidEmail({
          to: order.customerEmail,
          orderId: order.id,
          orderNumber: order.orderNumber,
          fileName: order.fileName,
          totalEur: order.paidTotalEur,
          shippingMethod: order.shippingMethod,
          shippingCostEur,
          deliveryAddress: order.deliveryAddress as any,
          config: order.config as any,
          pricing: order.pricing as any,
        });
      } else {
        await sendOrderStatusEmail({
          to: order.customerEmail,
          orderId: order.id,
          fileName: order.fileName,
          status,
        });
      }
    } catch (err) {
      console.error("Status email failed:", err);
    }
  }

  return NextResponse.json({ ok: true, status });
}
