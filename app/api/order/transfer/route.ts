import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { quote } from "@/lib/pricing";
import { addVat } from "@/lib/vat";
import { getSafeServerSession } from "@/lib/session";
import { generateVariableSymbol, COMPANY_INFO } from "@/lib/company-info";
import { SHIPPING_RATES } from "@/lib/shipping";
import { sendTransferPaymentEmail } from "@/lib/email-transfer";
import { sendAdminOrderNotificationEmail } from "@/lib/email-admin";

export const runtime = "nodejs";

async function generateOrderNumber(): Promise<string> {
  const PREFIX = "VYT3D-";
  const START = 1432;
  for (let attempt = 0; attempt < 10; attempt++) {
    const count = await prisma.order.count({ where: { orderNumber: { startsWith: PREFIX } } });
    const seq = START + count;
    const orderNumber = `${PREFIX}${seq}`;
    const exists = await prisma.order.findUnique({ where: { orderNumber } });
    if (!exists) return orderNumber;
  }
  return `${PREFIX}${Date.now().toString().slice(-6)}`;
}

type RawItem = {
  fileKey: string;
  fileName: string;
  fileSize?: number;
  analysis: { volumeCm3: number; dimsXmm?: number; dimsYmm?: number; dimsZmm?: number };
  config: { material: string; quality: string; infillPct?: number; quantity?: number; scalePct?: number; color?: string };
};

export async function POST(req: NextRequest) {
  try {
    const session = await getSafeServerSession();
    const sessionUser = session?.user as { id?: string; email?: string | null } | undefined;
    const userId = sessionUser?.id ?? null;
    const sessionEmail = sessionUser?.email ?? null;

    if (!userId) {
      return NextResponse.json(
        { error: "Platba prevodom je dostupná len pre prihlásených zákazníkov." },
        { status: 401 }
      );
    }

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

    const deliveryMethod: "packeta" | "courier" =
      body?.deliveryMethod === "courier" ? "courier" : "packeta";
    const packetaPoint = deliveryMethod === "packeta" ? (body?.packetaPoint ?? null) : null;
    const co = body?.contactOverride ?? null;

    // Normalise to items array — supports both new {items:[]} and legacy {uploaded,config}
    let rawItems: RawItem[];
    if (Array.isArray(body?.items) && body.items.length > 0) {
      rawItems = body.items;
    } else if (body?.uploaded?.fileKey) {
      rawItems = [{
        fileKey: body.uploaded.fileKey,
        fileName: body.uploaded.fileName,
        fileSize: body.uploaded.fileSize,
        analysis: body.uploaded.analysis,
        config: body.config,
      }];
    } else {
      return NextResponse.json({ error: "Missing items or uploaded data" }, { status: 400 });
    }

    // Validate + calculate server-side pricing for each item
    const pricedItems = [];
    for (const item of rawItems) {
      const rawVol = Number(item.analysis?.volumeCm3);
      if (!Number.isFinite(rawVol) || rawVol <= 0) {
        return NextResponse.json({ error: `Invalid volumeCm3 for ${item.fileName}` }, { status: 400 });
      }
      const qty = Number(item.config?.quantity ?? 1);
      const infill = Number(item.config?.infillPct ?? 20);
      const scale = Number(item.config?.scalePct ?? 100);
      if (!Number.isFinite(qty) || qty < 1) {
        return NextResponse.json({ error: "Quantity must be >= 1" }, { status: 400 });
      }
      if (!Number.isFinite(infill) || infill < 5 || infill > 50) {
        return NextResponse.json({ error: "Invalid infillPct" }, { status: 400 });
      }
      if (!Number.isFinite(scale) || scale < 10 || scale > 200) {
        return NextResponse.json({ error: "Invalid scalePct" }, { status: 400 });
      }
      if (!item.config?.material || !item.config?.quality) {
        return NextResponse.json({ error: `Missing material/quality for ${item.fileName}` }, { status: 400 });
      }

      const scaleFactor = scale / 100;
      const scaledVol = rawVol * Math.pow(scaleFactor, 3);

      const serverPricing = quote({
        volumeCm3: scaledVol,
        material: item.config.material as any,
        quality: item.config.quality as any,
        infillPct: infill,
        quantity: qty,
      });

      pricedItems.push({ item, serverPricing, scaledVol, infill, scale, rawVol });
    }

    const totalNet = pricedItems.reduce((s, pi) => s + pi.serverPricing.total, 0);
    const shippingCostWithVat = deliveryMethod === "courier" ? SHIPPING_RATES.COURIER : SHIPPING_RATES.PACKETA;
    const productionWithVat = addVat(totalNet);
    const totalWithVat = Math.round((productionWithVat + shippingCostWithVat) * 100) / 100;

    const first = pricedItems[0];
    const combinedPricing = pricedItems.length === 1
      ? first.serverPricing
      : { ...first.serverPricing, total: totalNet };

    const shippingMethod = deliveryMethod === "courier" ? "Kurier" : "Packeta vyzdvihna / Z-Box";
    const customerEmail = sessionEmail ?? dbUser?.email ?? null;
    const orderNumber = await generateOrderNumber();

    const deliveryAddr =
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
          };

    const order = await prisma.order.create({
      data: {
        orderNumber,
        status: "AWAITING_TRANSFER",
        paymentMethod: "TRANSFER",
        fileKey: first.item.fileKey,
        fileName: first.item.fileName,
        analysis: {
          ...first.item.analysis,
          originalVolumeCm3: first.rawVol,
          scaledVolumeCm3: first.scaledVol,
          scalePct: first.scale,
        },
        config: { ...first.item.config, infillPct: first.infill, scalePct: first.scale },
        pricing: combinedPricing as any,
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
        deliveryAddress: deliveryAddr,
      },
      select: { id: true, orderNumber: true, fileName: true, customerEmail: true },
    });

    // Create one OrderItem per model
    await prisma.orderItem.createMany({
      data: pricedItems.map((pi) => ({
        orderId: order.id,
        fileKey: pi.item.fileKey,
        fileName: pi.item.fileName,
        analysis: pi.item.analysis as any,
        config: { ...pi.item.config, infillPct: pi.infill, scalePct: pi.scale } as any,
        pricing: pi.serverPricing as any,
      })),
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

    const adminDeliveryAddr =
      deliveryMethod === "packeta" && packetaPoint
        ? {
            type: "packeta",
            packetaPointName: packetaPoint.name,
            street: packetaPoint.nameStreet ?? null,
            city: packetaPoint.city ?? null,
            zip: packetaPoint.zip ?? null,
            country: "SK",
          }
        : {
            name: co?.shippingName || dbUser?.shippingName || null,
            street: co?.shippingStreet || dbUser?.shippingStreet || null,
            city: co?.shippingCity || dbUser?.shippingCity || null,
            zip: co?.shippingZip || dbUser?.shippingZip || null,
            country: co?.shippingCountry || dbUser?.shippingCountry || null,
          };

    try {
      await sendAdminOrderNotificationEmail({
        orderId: order.id,
        orderNumber: order.orderNumber,
        fileName: order.fileName,
        customerEmail,
        totalEur: totalWithVat,
        shippingMethod,
        shippingCostEur: shippingCostWithVat,
        phone: co?.phone || dbUser?.phone || null,
        accountType: dbUser?.accountType ?? null,
        companyName: dbUser?.companyName ?? null,
        ico: dbUser?.ico ?? null,
        dic: dbUser?.dic ?? null,
        icDph: dbUser?.icDph ?? null,
        contactPerson: co?.name || dbUser?.contactPerson || null,
        deliveryAddress: adminDeliveryAddr,
        config: { ...first.item.config, infillPct: first.infill, scalePct: first.scale },
        pricing: combinedPricing as any,
        createdAt: new Date(),
      });
    } catch (err) {
      console.error("Admin transfer notification email failed:", err);
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
