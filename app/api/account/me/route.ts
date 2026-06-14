import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSafeServerSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSafeServerSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      phone: true,
      accountType: true,
      companyName: true,
      contactPerson: true,
      billingStreet: true,
      billingCity: true,
      billingZip: true,
      billingCountry: true,
      shippingName: true,
      shippingContact: true,
      shippingStreet: true,
      shippingCity: true,
      shippingZip: true,
      shippingCountry: true,
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}
