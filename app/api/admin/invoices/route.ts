import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSafeServerSession } from "@/lib/session";
import { addVat, vatAmount } from "@/lib/vat";
import { getSellerInfo } from "@/lib/seller";

export const runtime = "nodejs";

function isAdmin(email: string | null | undefined) {
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return !!email && admins.includes(email.toLowerCase());
}

async function generateInvoiceNumber(isTest: boolean): Promise<string> {
  const prefix = isTest ? "4026" : "3026";
  for (let attempt = 0; attempt < 20; attempt++) {
    const count = await prisma.invoice.count({
      where: { invoiceNumber: { startsWith: prefix }, type: "INVOICE" },
    });
    const seq = String(count + 1).padStart(4, "0");
    const number = `${prefix}${seq}`;
    const exists = await prisma.invoice.findUnique({ where: { invoiceNumber: number } });
    if (!exists) return number;
  }
  return `${prefix}${Date.now().toString().slice(-4)}`;
}

export async function POST(req: NextRequest) {
  const session = await getSafeServerSession();
  const email = (session?.user as any)?.email;
  if (!isAdmin(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const orderId: string | undefined = body?.orderId;
  const isTest: boolean = body?.isTest === true;

  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const pricing = (order.pricing ?? {}) as Record<string, any>;
  const shippingCost = (order.shippingCost ?? {}) as Record<string, any>;
  const billing = (order.billingAddress ?? {}) as Record<string, any>;
  const delivery = (order.deliveryAddress ?? {}) as Record<string, any>;

  const productionNet: number =
    typeof pricing.total === "number" ? pricing.total : 0;
  const shippingEur: number =
    typeof shippingCost.amount === "number" ? shippingCost.amount / 100 : 0;

  const totalNet = Math.round((productionNet + shippingEur / 1.23) * 100) / 100;
  const totalVatAmt = Math.round(vatAmount(productionNet) * 100) / 100 + Math.round((shippingEur - shippingEur / 1.23) * 100) / 100;
  const totalGross =
    typeof order.paidTotalEur === "number"
      ? order.paidTotalEur
      : addVat(productionNet) + shippingEur;

  const config = (order.config ?? {}) as Record<string, any>;

  const items = [
    {
      description: `3D tlač: ${order.fileName}${config.material ? ` (${config.material}` : ""}${config.quality ? `, ${config.quality}` : ""}${config.color ? `, ${config.color}` : ""}${config.material || config.quality || config.color ? ")" : ""}`,
      quantity: config.quantity ?? 1,
      unitNet: Math.round((productionNet / (config.quantity ?? 1)) * 100) / 100,
      vatRate: 23,
      totalNet: productionNet,
      totalGross: addVat(productionNet),
    },
    ...(shippingEur > 0
      ? [
          {
            description: `Doprava: ${order.shippingMethod ?? "Kuriér"}`,
            quantity: 1,
            unitNet: Math.round((shippingEur / 1.23) * 100) / 100,
            vatRate: 23,
            totalNet: Math.round((shippingEur / 1.23) * 100) / 100,
            totalGross: shippingEur,
          },
        ]
      : []),
  ];

  const name =
    delivery.name ??
    billing.name ??
    order.contactPerson ??
    order.customerEmail ??
    "Zákazník";

  const customerSnapshot = {
    name,
    email: order.customerEmail,
    phone: order.phone,
    accountType: order.accountType,
    companyName: order.companyName,
    ico: order.ico,
    dic: order.dic,
    icDph: order.icDph,
    street: billing.street ?? billing.line1 ?? delivery.street ?? null,
    city: billing.city ?? delivery.city ?? null,
    zip: billing.zip ?? billing.postal_code ?? delivery.zip ?? null,
    country: billing.country ?? delivery.country ?? null,
    paymentMethod: order.paymentMethod ?? "CARD",
  };

  const deliveredAt = order.updatedAt ?? order.createdAt ?? new Date();

  const invoiceNumber = await generateInvoiceNumber(isTest);
  const issuedAt = new Date();
  const dueAt = new Date(issuedAt.getTime() + 14 * 24 * 60 * 60 * 1000);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      type: "INVOICE",
      isTest,
      orderId,
      issuedAt,
      dueAt,
      deliveredAt,
      variableSymbol: order.variableSymbol ?? null,
      sellerSnapshot: getSellerInfo() as any,
      customerSnapshot: customerSnapshot as any,
      items: items as any,
      totalNet,
      totalVat: totalVatAmt,
      totalGross,
      deliveryAddress: delivery as any,
    },
  });

  return NextResponse.json({ ok: true, invoice });
}
