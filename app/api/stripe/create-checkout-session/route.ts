import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { quote } from "@/lib/pricing";
import { addVat } from "@/lib/vat";
import { SHIPPING_RATES } from "@/lib/shipping";
import { getSafeServerSession } from "@/lib/session";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover",
});

async function generateOrderNumber(): Promise<string> {
  const PREFIX = "VYT3D-";
  const START = 1432;

  for (let attempt = 0; attempt < 10; attempt++) {
    const count = await prisma.order.count({
      where: { orderNumber: { startsWith: PREFIX } },
    });
    const seq = START + count;
    const orderNumber = `${PREFIX}${seq}`;
    const exists = await prisma.order.findUnique({ where: { orderNumber } });
    if (!exists) return orderNumber;
  }

  return `${PREFIX}${Date.now().toString().slice(-6)}`;
}

function getBaseUrl(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin) return origin;

  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";

  if (host) return `${proto}://${host}`;

  return "http://localhost:3000";
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
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
    }

    const session = await getSafeServerSession();
    const sessionUser = session?.user as { id?: string; email?: string | null } | undefined;

    const userId = sessionUser?.id ?? null;
    const sessionEmail = sessionUser?.email ?? null;

    const dbUser = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            stripeCustomerId: true,
            accountType: true,
            companyName: true,
            ico: true,
            dic: true,
            icDph: true,
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
        return NextResponse.json({ error: `Quantity must be >= 1 for ${item.fileName}` }, { status: 400 });
      }
      if (!Number.isFinite(infill) || infill < 5 || infill > 50) {
        return NextResponse.json({ error: `Invalid infillPct for ${item.fileName}` }, { status: 400 });
      }
      if (!Number.isFinite(scale) || scale < 10 || scale > 200) {
        return NextResponse.json({ error: `Invalid scalePct for ${item.fileName}` }, { status: 400 });
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

      pricedItems.push({ item, serverPricing, scaledVol, infill, scale, rawVol, qty });
    }

    const totalNet = pricedItems.reduce((s, pi) => s + pi.serverPricing.total, 0);
    const totalWithVat = addVat(totalNet);

    const first = pricedItems[0];
    const combinedPricing = pricedItems.length === 1
      ? first.serverPricing
      : { ...first.serverPricing, total: totalNet };

    const orderNumber = await generateOrderNumber();

    const order = await prisma.order.create({
      data: {
        orderNumber,
        status: "PENDING",
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
        userId,
        customerEmail: sessionEmail ?? dbUser?.email ?? null,
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
      select: { id: true },
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

    const baseUrl = getBaseUrl(req);
    const customerName = dbUser?.contactPerson || dbUser?.name || null;

    const hasShippingAddress = !!(
      dbUser?.shippingStreet && dbUser?.shippingCity && dbUser?.shippingZip && dbUser?.shippingCountry
    );

    const prefillShipping = hasShippingAddress
      ? {
          name: dbUser?.shippingName || dbUser?.shippingContact || customerName || "",
          address: {
            line1: dbUser!.shippingStreet!,
            city: dbUser!.shippingCity!,
            postal_code: dbUser!.shippingZip!,
            country: dbUser!.shippingCountry!,
          },
        }
      : null;

    let stripeCustomerId: string | undefined = undefined;

    if (userId && dbUser) {
      if (dbUser.stripeCustomerId) {
        stripeCustomerId = dbUser.stripeCustomerId;
        if (hasShippingAddress) {
          await stripe.customers.update(stripeCustomerId, {
            name: customerName || undefined,
            email: dbUser.email || undefined,
            phone: dbUser.phone || undefined,
            shipping: prefillShipping
              ? { name: prefillShipping.name, address: prefillShipping.address }
              : undefined,
            address:
              dbUser.billingStreet && dbUser.billingCity
                ? {
                    line1: dbUser.billingStreet,
                    city: dbUser.billingCity,
                    postal_code: dbUser.billingZip || undefined,
                    country: dbUser.billingCountry || undefined,
                  }
                : undefined,
          });
        }
      } else {
        const newCustomer = await stripe.customers.create({
          email: dbUser.email || undefined,
          name: customerName || undefined,
          phone: dbUser.phone || undefined,
          shipping: prefillShipping
            ? { name: prefillShipping.name, address: prefillShipping.address }
            : undefined,
          address:
            dbUser.billingStreet && dbUser.billingCity
              ? {
                  line1: dbUser.billingStreet,
                  city: dbUser.billingCity,
                  postal_code: dbUser.billingZip || undefined,
                  country: dbUser.billingCountry || undefined,
                }
              : undefined,
          metadata: { userId },
        });

        stripeCustomerId = newCustomer.id;

        await prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId: newCustomer.id },
        });
      }
    }

    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: order.id,
      billing_address_collection: "required",
      shipping_address_collection: { allowed_countries: ["SK"] },
      phone_number_collection: { enabled: true },
      shipping_options: [
        deliveryMethod === "packeta"
          ? {
              shipping_rate_data: {
                display_name: "Packeta výdajňa / Z-Box",
                type: "fixed_amount" as const,
                fixed_amount: { amount: Math.round(SHIPPING_RATES.PACKETA * 100), currency: "eur" },
                tax_behavior: "inclusive" as const,
              },
            }
          : {
              shipping_rate_data: {
                display_name: "Kuriér",
                type: "fixed_amount" as const,
                fixed_amount: { amount: Math.round(SHIPPING_RATES.COURIER * 100), currency: "eur" },
                tax_behavior: "inclusive" as const,
              },
            },
      ],
      ...(stripeCustomerId
        ? {
            customer: stripeCustomerId,
            customer_update: {
              shipping: "auto" as const,
              address: "auto" as const,
              name: "auto" as const,
            },
          }
        : { customer_email: sessionEmail ?? undefined }),
      line_items: pricedItems.map((pi) => ({
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: Math.round(addVat(pi.serverPricing.total) * 100),
          product_data: {
            name: `3D tlac: ${pi.item.fileName}`,
            description: `${pi.item.config.material}, ${pi.item.config.quality}, ${pi.qty}ks | mierka ${pi.scale}%`,
          },
        },
      })),
      metadata: {
        orderId: order.id,
        itemCount: String(pricedItems.length),
        userId: userId ?? "",
        customerEmail: sessionEmail ?? dbUser?.email ?? "",
        isTestOrder: "false",
        deliveryMethod,
        packetaPointId: packetaPoint?.id ? String(packetaPoint.id) : "",
        packetaPointName: packetaPoint?.name ?? "",
        packetaCity: packetaPoint?.city ?? "",
        packetaZip: packetaPoint?.zip ?? "",
        packetaStreet: packetaPoint?.nameStreet ?? "",
      },
      payment_intent_data: {
        metadata: {
          orderId: order.id,
          itemCount: String(pricedItems.length),
          userId: userId ?? "",
          customerEmail: sessionEmail ?? dbUser?.email ?? "",
          isTestOrder: "false",
          deliveryMethod,
        },
      },
      success_url: `${baseUrl}/success?orderId=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel?orderId=${order.id}`,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: stripeSession.id },
    });

    return NextResponse.json({
      url: stripeSession.url,
      orderId: order.id,
      sessionId: stripeSession.id,
      checkoutTotalWithVat: totalWithVat,
    });
  } catch (e: any) {
    console.error("create-checkout-session error:", e);
    return NextResponse.json({ error: e?.message || "Checkout failed" }, { status: 500 });
  }
}
