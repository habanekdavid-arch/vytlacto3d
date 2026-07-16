import { NextRequest, NextResponse } from "next/server";
import { getSafeServerSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { sendTransferPaymentEmail } from "@/lib/email-transfer";
import { generateVariableSymbol } from "@/lib/company-info";

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

  const { orderId } = await req.json();
  if (!orderId) {
    return NextResponse.json({ error: "Chýba orderId." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      fileName: true,
      customerEmail: true,
      paidTotalEur: true,
      variableSymbol: true,
      status: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Objednávka neexistuje." }, { status: 404 });
  }
  if (!order.customerEmail) {
    return NextResponse.json({ error: "Objednávka nemá email zákazníka." }, { status: 400 });
  }

  const variableSymbol = order.variableSymbol ?? generateVariableSymbol(order.orderNumber);

  // Unlike the checkout-time send, don't swallow the error — the admin
  // clicking this button needs to see immediately *why* it failed, if it did.
  try {
    await sendTransferPaymentEmail({
      to: order.customerEmail,
      orderId: order.id,
      orderNumber: order.orderNumber,
      fileName: order.fileName,
      amount: order.paidTotalEur ?? 0,
      variableSymbol,
    });
  } catch (err: any) {
    console.error("Resend transfer email failed:", err);
    return NextResponse.json(
      { error: err?.message || "Odoslanie emailu zlyhalo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, to: order.customerEmail });
}
