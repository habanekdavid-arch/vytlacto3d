import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { isColorAllowed, isMaterial, isQuality, quote, scaledGeometry } from "@/lib/pricing";
import { isMulticolor, validatePartColors } from "@/lib/multicolor";
import { COLOR_LABELS } from "@/lib/print-options";
import { createOrderWithNumber } from "@/lib/order-number";
import { addVat } from "@/lib/vat";
import { activePromo } from "@/lib/promo";
import { applyCouponToPricing, cancelAbandonedOrder, checkCoupon, claimCoupon, normalizeCouponCode, type CouponCheck } from "@/lib/coupons";
import { getSafeServerSession } from "@/lib/session";
import { generateVariableSymbol, COMPANY_INFO } from "@/lib/company-info";
import { SHIPPING_RATES } from "@/lib/shipping";
import { sendTransferPaymentEmail } from "@/lib/email-transfer";
import { sendAdminOrderNotificationEmail } from "@/lib/email-admin";

export const runtime = "nodejs";

type RawItem = {
  fileKey: string;
  fileName: string;
  fileSize?: number;
  analysis: { volumeCm3: number; dimsXmm?: number; dimsYmm?: number; dimsZmm?: number; surfaceAreaCm2?: number; supportCm3?: number; printHeightMm?: number };
  config: { material: string; quality: string; infillPct?: number; quantity?: number; scalePct?: number; color?: string; materialFlexible?: boolean; colorFlexible?: boolean; partColors?: string[] };
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
            id: true, name: true, email: true, phone: true, accountType: true,
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
    // Dobrovoľný súhlas z posledného kroku checkoutu — nemá vplyv na cenu,
    // len na to, čo uvidí výroba.
    const allowModelAdjustments = Boolean(body?.allowModelAdjustments);

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
    // Akcia (lib/promo) platí podľa času na serveri, nie podľa prehliadača.
    const promo = activePromo();
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
      // Neznáma hodnota by z cenníka vyzdvihla `undefined` a cena by vyšla NaN.
      if (!isMaterial(item.config.material)) {
        return NextResponse.json({ error: `Neznámy materiál pre ${item.fileName}` }, { status: 400 });
      }
      // PA6-CF len v čiernej a bielej — iná farba sa nedá vyrobiť.
      if (!item.config.colorFlexible && !isColorAllowed(item.config.material, String(item.config.color ?? ""))) {
        return NextResponse.json(
          { error: `Materiál ${item.config.material} tlačíme len v čiernej alebo bielej farbe (${item.fileName}).` },
          { status: 400 }
        );
      }
            if (!isQuality(item.config.quality)) {
        return NextResponse.json({ error: `Neznáma kvalita tlače pre ${item.fileName}` }, { status: 400 });
      }

      const geometry = scaledGeometry(item.analysis, scale);
      const scaledVol = geometry.volumeCm3;
      // Viacfarebná tlač: farby častí overíme; jednofarebné zoznamy zahodíme,
      // aby výroba videla len farbu položky.
      const partColorsError = validatePartColors(item.config.material, item.config.partColors, COLOR_LABELS);
      if (partColorsError) {
        return NextResponse.json({ error: `${partColorsError} (${item.fileName})` }, { status: 400 });
      }
      const multicolor = isMulticolor(item.config.partColors);
      if (!multicolor) delete item.config.partColors;
      const materialFlexible = Boolean(item.config.materialFlexible);
      const colorFlexible = !multicolor && Boolean(item.config.colorFlexible);

      const serverPricing = quote({
        ...geometry,
        material: item.config.material as any,
        quality: item.config.quality as any,
        infillPct: infill,
        quantity: qty,
        materialFlexible,
        colorFlexible,
        multicolor,
        promoPercent: promo?.percent,
      });

      pricedItems.push({ item, serverPricing, scaledVol, infill, scale, rawVol, materialFlexible, colorFlexible });
    }

    // Zľavový kupón: overí sa tu na serveri a zľava sa zapíše do ceny položiek.
    const couponCode = normalizeCouponCode(body?.couponCode);
    let coupon: Extract<CouponCheck, { ok: true }> | null = null;
    if (couponCode) {
      const check = await checkCoupon(couponCode);
      if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
      // Kupón drží nedokončená platba kartou — zrušíme ju, aby sa kupón
      // nedal použiť dvakrát.
      if (check.heldBy?.status === "PENDING" && check.heldBy.stripeSessionId) {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
        const old = await stripe.checkout.sessions.retrieve(check.heldBy.stripeSessionId).catch(() => null);
        if (!old) {
          return NextResponse.json({ error: "Kupón sa nepodarilo overiť. Skúste to znova." }, { status: 503 });
        }
        if (old.status === "complete") {
          return NextResponse.json({ error: "Tento kupón už bol použitý." }, { status: 400 });
        }
        if (old.status === "expired") await cancelAbandonedOrder(check.heldBy.orderId);
        if (old.status === "open") {
          try {
            await stripe.checkout.sessions.expire(old.id);
            await cancelAbandonedOrder(check.heldBy.orderId);
          } catch {
            return NextResponse.json({ error: "Kupón sa práve používa v inej platbe. Skúste to o chvíľu." }, { status: 409 });
          }
        }
      }
      coupon = check;
      for (const pi of pricedItems) {
        pi.serverPricing = applyCouponToPricing(pi.serverPricing, check.code, check.percent);
      }
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

    const order = await createOrderWithNumber((orderNumber) => prisma.order.create({
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
        config: {
          ...first.item.config,
          infillPct: first.infill,
          scalePct: first.scale,
          materialFlexible: first.materialFlexible,
          colorFlexible: first.colorFlexible,
          allowModelAdjustments,
        },
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
          name: co?.name || dbUser?.contactPerson || dbUser?.name || null,
          street: co?.billingStreet || dbUser?.billingStreet || null,
          city: co?.billingCity || dbUser?.billingCity || null,
          zip: co?.billingZip || dbUser?.billingZip || null,
          country: co?.billingCountry || dbUser?.billingCountry || null,
        },
        deliveryAddress: deliveryAddr,
      },
      select: { id: true, orderNumber: true, fileName: true, customerEmail: true, billingAddress: true, status: true },
    }));

    // Objednávka prevodom kupón použije hneď.
    if (coupon && !(await claimCoupon(coupon.code, order.id, coupon.holderOrderId, true))) {
      await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
      return NextResponse.json({ error: "Kupón sa práve použil v inej objednávke." }, { status: 409 });
    }

    // Create one OrderItem per model
    await prisma.orderItem.createMany({
      data: pricedItems.map((pi) => ({
        orderId: order.id,
        fileKey: pi.item.fileKey,
        fileName: pi.item.fileName,
        analysis: pi.item.analysis as any,
        config: {
          ...pi.item.config,
          infillPct: pi.infill,
          scalePct: pi.scale,
          materialFlexible: pi.materialFlexible,
          colorFlexible: pi.colorFlexible,
          allowModelAdjustments,
        } as any,
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
    } else {
      console.warn("Transfer payment email skipped: no customer email for order", order.id);
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
            contact: co?.name || dbUser?.shippingContact || null,
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
        accountName: dbUser?.name,
        billingAddress: order.billingAddress as any,
        deliveryAddress: adminDeliveryAddr,
        config: {
          ...first.item.config,
          infillPct: first.infill,
          scalePct: first.scale,
          materialFlexible: first.materialFlexible,
          colorFlexible: first.colorFlexible,
          allowModelAdjustments,
        },
        pricing: combinedPricing as any,
        paymentMethod: "TRANSFER",
        variableSymbol,
        status: order.status,
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
