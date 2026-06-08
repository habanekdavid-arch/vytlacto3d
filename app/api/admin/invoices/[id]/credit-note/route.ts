import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSafeServerSession } from "@/lib/session";
import { getSellerInfo } from "@/lib/seller";

export const runtime = "nodejs";

function isAdmin(email: string | null | undefined) {
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return !!email && admins.includes(email.toLowerCase());
}

async function generateCreditNoteNumber(isTest: boolean): Promise<string> {
  const prefix = isTest ? "6026" : "5026";
  for (let attempt = 0; attempt < 20; attempt++) {
    const count = await prisma.invoice.count({
      where: { invoiceNumber: { startsWith: prefix }, type: "CREDIT_NOTE" },
    });
    const seq = String(count + 1).padStart(4, "0");
    const number = `${prefix}${seq}`;
    const exists = await prisma.invoice.findUnique({ where: { invoiceNumber: number } });
    if (!exists) return number;
  }
  return `${prefix}${Date.now().toString().slice(-4)}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSafeServerSession();
  const email = (session?.user as any)?.email;
  if (!isAdmin(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const original = await prisma.invoice.findUnique({
    where: { id },
    include: { creditNotes: true },
  });

  if (!original) {
    return NextResponse.json({ error: "Faktúra nenájdená" }, { status: 404 });
  }

  if (original.type !== "INVOICE") {
    return NextResponse.json({ error: "Dobropis možno vystaviť iba k faktúre" }, { status: 400 });
  }

  if (original.creditNotes.length > 0) {
    return NextResponse.json(
      { error: "K tejto faktúre už existuje dobropis.", creditNote: original.creditNotes[0] },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const note: string | undefined = body?.note;

  const originalItems = original.items as any[];
  const creditItems = originalItems.map((item) => ({
    ...item,
    totalNet: -Math.abs(item.totalNet),
    totalGross: -Math.abs(item.totalGross),
    unitNet: -Math.abs(item.unitNet),
    description: item.description,
  }));

  const invoiceNumber = await generateCreditNoteNumber(original.isTest);
  const issuedAt = new Date();
  const dueAt = new Date(issuedAt.getTime() + 14 * 24 * 60 * 60 * 1000);

  const creditNote = await prisma.invoice.create({
    data: {
      invoiceNumber,
      type: "CREDIT_NOTE",
      isTest: original.isTest,
      orderId: original.orderId,
      creditNoteForId: original.id,
      issuedAt,
      dueAt,
      sellerSnapshot: getSellerInfo() as any,
      customerSnapshot: original.customerSnapshot as any,
      items: creditItems as any,
      totalNet: -Math.abs(original.totalNet),
      totalVat: -Math.abs(original.totalVat),
      totalGross: -Math.abs(original.totalGross),
      note: note ?? `Dobropis k faktúre č. ${original.invoiceNumber}`,
    },
  });

  return NextResponse.json({ ok: true, creditNote });
}
