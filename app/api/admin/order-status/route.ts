import { NextRequest, NextResponse } from "next/server";
import { getSafeServerSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { sendOrderStatusEmail } from "@/lib/email-status";

const VALID_STATUSES = [
  "PENDING",
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

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status },
  });

  if (order.customerEmail) {
    try {
      await sendOrderStatusEmail({
        to: order.customerEmail,
        orderId: order.id,
        fileName: order.fileName,
        status,
      });
    } catch (err) {
      console.error("Status email failed:", err);
    }
  }

  return NextResponse.json({ ok: true, status });
}
