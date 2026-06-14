import { NextRequest, NextResponse } from "next/server";
import { getSafeServerSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const ALLOWED_FIELDS = [
  "name", "phone",
  "accountType", "companyName", "ico", "dic", "icDph", "contactPerson",
  "billingStreet", "billingCity", "billingZip", "billingCountry",
  "shippingName", "shippingContact", "shippingStreet", "shippingCity",
  "shippingZip", "shippingCountry",
] as const;

export async function POST(req: NextRequest) {
  const session = await getSafeServerSession();
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return NextResponse.json({ error: "Nie ste prihlásený." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Neplatné dáta." }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      const value = body[field];
      data[field] = typeof value === "string" ? value.trim() || null : value;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Žiadne dáta na uloženie." }, { status: 400 });
  }

  if (data.accountType && !["PERSON", "COMPANY"].includes(data.accountType as string)) {
    return NextResponse.json({ error: "Neplatný typ účtu." }, { status: 400 });
  }

  await prisma.user.update({ where: { id: userId }, data });

  return NextResponse.json({ ok: true });
}
