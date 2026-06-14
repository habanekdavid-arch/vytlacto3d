import { NextRequest, NextResponse } from "next/server";
import { getSafeServerSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const EDITABLE_FIELDS = [
  "fileName",
  "status",
  "customerEmail",
  "phone",
  "accountType",
  "contactPerson",
  "companyName",
  "ico",
  "dic",
  "icDph",
  "shippingMethod",
] as const;

const EDITABLE_JSON_PATHS: Record<string, string[]> = {
  config: ["material", "quality", "color", "quantity", "infillPct", "scalePct"],
  shippingAddress: ["name", "phone", "line1", "line2", "city", "postal_code", "country"],
  deliveryAddress: ["name", "contact", "street", "city", "zip", "country"],
  billingAddress: ["street", "city", "zip", "country"],
};

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

  const { orderId, field, jsonField, jsonKey, value } = await req.json();

  if (!orderId) {
    return NextResponse.json({ error: "Chýba orderId." }, { status: 400 });
  }

  if (field) {
    if (!EDITABLE_FIELDS.includes(field)) {
      return NextResponse.json({ error: "Toto pole nie je možné editovať." }, { status: 400 });
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { [field]: value === "" ? null : value },
    });

    return NextResponse.json({ ok: true, value: (order as any)[field] });
  }

  if (jsonField && jsonKey) {
    if (!EDITABLE_JSON_PATHS[jsonField]?.includes(jsonKey)) {
      return NextResponse.json({ error: "Toto pole nie je možné editovať." }, { status: 400 });
    }

    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      select: { [jsonField]: true },
    });

    const currentJson = (existing as any)?.[jsonField] ?? {};

    let finalValue: any = value;
    if (jsonField === "config" && (jsonKey === "infillPct" || jsonKey === "scalePct" || jsonKey === "quantity")) {
      finalValue = Number(value) || 0;
    }

    const updatedJson = { ...currentJson, [jsonKey]: finalValue };

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { [jsonField]: updatedJson },
    });

    return NextResponse.json({ ok: true, value: (order as any)[jsonField] });
  }

  return NextResponse.json({ error: "Neplatná požiadavka." }, { status: 400 });
}
