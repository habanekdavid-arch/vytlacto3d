import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { quote } from "@/lib/pricing";
import { addVat } from "@/lib/vat";
import { getSafeServerSession } from "@/lib/session";
import { generateVariableSymbol, COMPANY_INFO } from "@/lib/company-info";
import { SHIPPING_RATES } from "@/lib/shipping";
import { sendTransferPaymentEmail } from "@/lib/email-transfer";

export const runtime = "nodejs";


async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `VYT-${year}-`;
  for (let attempt = 0; attempt < 10; attempt++) {
    const count = await prisma.order.count({ where: { orderNumber: { startsWith: prefix } } });
    const seq = String(count + 1).padStart(4, "0");
    const orderNumber = `${prefix}${seq}`;
    const exists = await prisma.order.findUnique({ where: { orderNumber } });
    if (!exists) return orderNumber;
  }
  return `${prefix}${Date.now().toString().slice(-6)}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSafeServerSession();
    const sessionUser = session?.user as { id?: string; email?: string | null } | undefined;
    const userId = sessionUser?.id ?? null;
    const sessionEmail = sessionUser?.email ?? null;

    const dbUser = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true, email: true, phone: true, accountType: true,
            companyName: true, ico: true, dic: true, icDph: true, contactPerson: true,
            billingStreet: true, billingCity: true, billingZip: true, billingCountry: true,
            shippingName: true, shippingContact: true, shippingStreet: true,
            shippingCity: true, shippingZip: true, shippingCountry: true,
          },
        })
      : null;

    const body = await req.json().catch(() => null);

    if (!body?.uploaded?.fileKey || !body?.uploaded?.fileName) {
      return NextResponse.json({ error: "Missing uploaded data" }, { status: 400 });
    }
    if (!body?.uploaded?.analysis?.volumeCm3) {
      return NextResponse.json({ error: "Missing analysis.volumeCm3" }, { status: 400 });
    }
    if (!body?.config?.material || !body?.config?.quality) {
      return NextResponse.json({ error: "Missing config" }, { status: 400 });
    }

    const rawVolumeCm3 = Number(body.uploaded.analysis.volumeCm3);
    const quantity = Number(body.config.quantity ?? 1);
    const infillPct = Number(body.config.infillPct ?? 20);
    const scalePct = Number(body.config.scalePct ?? 100);
    const scaleFactor = scalePct / 100;
    const scaledVolumeCm3 = rawVolumeCm3 * Math.pow(scaleFactor, 3);

    if (!Number.isFinite(rawVolumeCm3) || rawVolumeCm3 <= 0) {
      return NextResponse.json({ error: "Invalid volumeCm3" }, { status: 400 });
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json({ error: "Quantity must be >= 1" }, { status: 400 });
    }
    if (!Number.isFinite(infillPct) || infillPct < 5 || infillPct > 50) {
      return NextResponse.json({ error: "Invalid infillPct" }, { status: 400 });
    }
    if (!Number.isFinite(scalePct) || scalePct < 10 || scalePct > 200) {
      return NextResponse.json({ error: "Invalid scalePct" }, { status: 400 });
    }

    const deliveryMethod: "packeta" | "courier" =
      body?.deliveryMethod === "courier" ? "courier" : "packeta";
    const packetaPoint = deliveryMethod === "packeta" ? (body?.packetaPoint ?? null) : null;
    const co = body?.contactOverride ?? null; // contact override from the checkout form

    const pricing = quote({
      volumeCm3: scaledVolumeCm3,
      material: body.config.material,
      quality: body.config.quality,
      infillPct,
      quantity,
    });

    const shippingCostWithVat = deliveryMethod === "courier"
      ? SHIPPING_RATES.COURIER
      : SHIPPING_RATES.PACKETA;
    const productionWithVat = addVat(pricing.total);
    const totalWithVat = Math.round((productionWithVat + shippingCostWithVat) * 100) / 100;

    const shippingMethod = deliveryMethod === "courier" ? "Kurier" : "Packeta vyzdvihna / Z-Box";

    const customerEmail = sessionEmail ?? dbUser?.email ?? null;

    const orderNumber = await generateOrderNumber();

    const order = await prisma.order.create({
      data: {
        orderNumber,
        status: "AWAITING_TRANSFER",
        paymentMethod: "TRANSFER",
        fileKey: body.uploaded.fileKey,
        fileName: body.uploaded.fileName,
        analysis: {
          ...body.uploaded.analysis,
          originalVolumeCm3: rawVolumeCm3,
          scaledVolumeCm3,
          scalePct,
        },
        config: { ...body.config, infillPct, scalePct },
        pricing: pricing as any,
        paidTotalEur: totalWithVat,
        shippingMethod,
        shippingCost: { amount: Math.round(shippingCostWithVat * 100), currency: "eur" } as any,
        userId,
        customerEmail,
        accountType: dbUser?.accountType ?? null,
        phone: co?.phone || dbUser?.phone || null,
        companyName: dbUser?.companyName ?? null,
        ico: dbUser?.ico ?? null,
        dic: dbUser?.dic ?? null,
        icDph: dbUser?.icDph ?? null,
        contactPerson: co?.name || dbUser?.contactPerson || null,
        billingAddress: {
          street: co?.billingStreet || dbUser?.billingStreet || null,
          city: co?.billingCity || dbUser?.billingCity || null,
          zip: co?.billingZip || dbUser?.billingZip || null,
          country: co?.billingCountry || dbUser?.billingCountry || null,
        },
        deliveryAddress:
          deliveryMethod === "packeta" && packetaPoint
            ? {
                type: "packeta",
                packetaPointId: String(packetaPoint.id),
                packetaPointName: packetaPoint.name,
                street: packetaPoint.nameStreet ?? null,
                city: packetaPoint.city ?? null,
                zip: packetaPoint.zip ?? null,
                country: "SK",
              }
            : {
                name: co?.shippingName || dbUser?.shippingName || null,
                contact: co?.name || dbUser?.shippingContact || null,
                street: co?.shippingStreet || dbUser?.shippingStreet || null,
                city: co?.shippingCity || dbUser?.shippingCity || null,
                zip: co?.shippingZip || dbUser?.shippingZip || null,
                country: co?.shippingCountry || dbUser?.shippingCountry || null,
              },
      },
      select: { id: true, orderNumber: true, fileName: true, customerEmail: true },
    });

    const variableSymbol = generateVariableSymbol(order.orderNumber);

    await prisma.order.update({
      where: { id: order.id },
      data: { variableSymbol },
    });

    if (customerEmail) {
      try {
        await sendTransferPaymentEmail({
          to: customerEmail,
          orderId: order.id,
          orderNumber: order.orderNumber,
          fileName: order.fileName,
          amount: totalWithVat,
          variableSymbol,
        });
      } catch (err) {
        console.error("Transfer email failed:", err);
      }
    }

    return NextResponse.json({
      orderId: order.id,
      variableSymbol,
      amount: totalWithVat,
      iban: COMPANY_INFO.iban,
      redirectUrl: `/ucet/objednavky/${order.id}`,
    });
  } catch (e: any) {
    console.error("Transfer order error:", e);
    return NextResponse.json({ error: e?.message || "Chyba pri vytváraní objednávky" }, { status: 500 });
  }
}
