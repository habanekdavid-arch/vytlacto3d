import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { sendOrderPaidEmail } from "@/lib/email";
import { sendAdminOrderNotificationEmail } from "@/lib/email-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Admin: znova odošle potvrdenie objednávky zákazníkovi a/alebo notifikáciu
 * do internej schránky (napr. keď pri objednávke vypadol poštový server).
 */
export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Nemáte prístup." }, { status: 403 });
  const body = await req.json().catch(() => null);
  const orderId = String(body?.orderId ?? "");
  const target: "both" | "customer" | "admin" = body?.target === "customer" || body?.target === "admin" ? body.target : "both";
  if (!orderId) return NextResponse.json({ error: "Chýba orderId." }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      fileName: true,
      customerEmail: true,
      paidTotalEur: true,
      shippingMethod: true,
      shippingCost: true,
      phone: true,
      accountType: true,
      companyName: true,
      ico: true,
      dic: true,
      icDph: true,
      contactPerson: true,
      billingAddress: true,
      deliveryAddress: true,
      config: true,
      pricing: true,
      paymentMethod: true,
      status: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  });
  if (!order) return NextResponse.json({ error: "Objednávka neexistuje." }, { status: 404 });

  const shippingCostEur =
    typeof (order.shippingCost as any)?.amount === "number" ? (order.shippingCost as any).amount / 100 : null;
  const sent: string[] = [];
  const errors: string[] = [];

  // Potvrdenie „zaplatené“ len pri zaplatenej objednávke (nie nedokončená
  // platba kartou, čakanie na prevod ani zrušená).
  const paid = !["PENDING", "AWAITING_TRANSFER", "CANCELLED"].includes(order.status);
  if (target !== "admin") {
    if (!paid) errors.push(`Zákazník: objednávka nie je zaplatená (${order.status}) — potvrdenie sa neposiela.`);
    else if (!order.customerEmail) errors.push("Objednávka nemá e-mail zákazníka.");
    else {
      try {
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
        sent.push(`zákazníkovi (${order.customerEmail})`);
      } catch (e: any) {
        console.error("Resend customer order email failed:", e);
        errors.push(`Zákazník: ${e?.message || "odoslanie zlyhalo"}`);
      }
    }
  }

  if (target !== "customer") {
    try {
      await sendAdminOrderNotificationEmail({
        orderId: order.id,
        orderNumber: order.orderNumber,
        fileName: order.fileName,
        customerEmail: order.customerEmail,
        totalEur: order.paidTotalEur,
        shippingMethod: order.shippingMethod,
        shippingCostEur,
        phone: order.phone,
        accountType: order.accountType,
        companyName: order.companyName,
        ico: order.ico,
        dic: order.dic,
        icDph: order.icDph,
        contactPerson: order.contactPerson,
        accountName: order.user?.name,
        billingAddress: order.billingAddress as any,
        deliveryAddress: order.deliveryAddress as any,
        config: order.config as any,
        pricing: order.pricing as any,
        paymentMethod: order.paymentMethod as any,
        status: order.status,
        createdAt: order.createdAt,
      });
      sent.push("do internej schránky");
    } catch (e: any) {
      console.error("Resend admin order email failed:", e);
      errors.push(`Interná schránka: ${e?.message || "odoslanie zlyhalo"}`);
    }
  }

  if (errors.length && !sent.length) return NextResponse.json({ error: errors.join(" | ") }, { status: 500 });
  return NextResponse.json({ ok: true, sent, errors });
}
