import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOrderStatusEmail } from "@/lib/email-status";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing id in route params." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json(
        { error: `Order not found: ${id}` },
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch (e: any) {
    console.error("GET /api/admin/orders/[id] failed:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing id in route params." },
        { status: 400 }
      );
    }

    const adminKey = req.headers.get("x-admin-key");
    if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const status = body?.status;

    const allowed = ["PENDING", "PAID", "PRINTING", "SHIPPED", "DONE", "CANCELED"];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        status: true,
        orderNumber: true,
        fileName: true,
        customerEmail: true,
        shippingMethod: true,
        paidTotalEur: true,
        shippingCost: true,
        deliveryAddress: true,
        config: true,
        pricing: true,
      },
    });

    if (updated.customerEmail) {
      const shippingCostEur =
        typeof (updated.shippingCost as any)?.amount === "number"
          ? (updated.shippingCost as any).amount / 100
          : null;

      sendOrderStatusEmail({
        to: updated.customerEmail,
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        fileName: updated.fileName,
        status: updated.status,
        shippingMethod: updated.shippingMethod,
        totalEur: updated.paidTotalEur,
        shippingCostEur,
        deliveryAddress: updated.deliveryAddress as any,
        config: updated.config as any,
        pricing: updated.pricing as any,
      }).catch((e) => console.error("Status email failed:", e));
    }

    return NextResponse.json({ ok: true, order: { id: updated.id, status: updated.status } });
  } catch (e: any) {
    console.error("PATCH /api/admin/orders/[id] failed:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
