import { NextRequest, NextResponse } from "next/server";
import { getSafeServerSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
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
    return NextResponse.json({ error: "Chýba orderId" }, { status: 400 });
  }

  // Najprv vymazať faktúry (FK constraint)
  await prisma.invoice.deleteMany({ where: { orderId } });
  await prisma.order.delete({ where: { id: orderId } });

  return NextResponse.json({ ok: true });
}
