import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { quote } from "@/lib/pricing";
import { addVat, formatEur } from "@/lib/vat";
import { getSafeServerSession } from "@/lib/session";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover",
});

function getBaseUrl(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin) return origin;

  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";

  if (host) return `${proto}://${host}`;

  return "http://localhost:3000";
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY" },
        { status: 500 }
      );
    }

    const session = await getSafeServerSession();
    const sessionUser = session?.user as
      | { id?: string; email?: string | null }
      | undefined;

    const userId = sessionUser?.id ?? null;
    const sessionEmail = sessionUser?.email ?? null;

    const dbUser = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            phone: true,
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

    if (!body?.uploaded?.fileKey || !body?.uploaded?.fileName) {
      return NextResponse.json(
        { error: "Missing uploaded data" },
        { status: 400 }
      );
    }

    if (!body?.uploaded?.analysis?.volumeCm3) {
      return NextResponse.json(
        { error: "Missing analysis.volumeCm3" },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "Invalid volumeCm3" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json(
        { error: "Quantity must be >= 1" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(infillPct) || infillPct < 0 || infillPct > 100) {
      return NextResponse.json(
        { error: "Invalid infillPct" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(scalePct) || scalePct < 10 || scalePct > 200) {
      return NextResponse.json(
        { error: "Invalid scalePct" },
        { status: 400 }
      );
    }

    const pricing = quote({
      volumeCm3: scaledVolumeCm3,
      material: body.config.material,
      quality: body.config.quality,
      infillPct,
      quantity,
    });

    const order = await prisma.order.create({
      data: {
        status: "PENDING",

        fileKey: body.uploaded.fileKey,
        fileName: body.uploaded.fileName,

        analysis: {
          ...body.uploaded.analysis,
          originalVolumeCm3: rawVolumeCm3,
          scaledVolumeCm3,
          scalePct,
        },

        config: {
          ...body.config,
          infillPct,
          scalePct,
        },

        pricing: pricing as any,

        userId,
        customerEmail: sessionEmail ?? dbUser?.email ?? null,

        accountType: dbUser?.accountType ?? null,
        phone: dbUser?.phone ?? null,

        companyName: dbUser?.companyName ?? null,
        ico: dbUser?.ico ?? null,
        dic: dbUser?.dic ?? null,
        icDph: dbUser?.icDph ?? null,
        contactPerson: dbUser?.contactPerson ?? null,

        billingAddress: {
          street: dbUser?.billingStreet ?? null,
          city: dbUser?.billingCity ?? null,
          zip: dbUser?.billingZip ?? null,
          country: dbUser?.billingCountry ?? null,
        },

        deliveryAddress: {
          name: dbUser?.shippingName ?? null,
          contact: dbUser?.shippingContact ?? null,
          street: dbUser?.shippingStreet ?? null,
          city: dbUser?.shippingCity ?? null,
          zip: dbUser?.shippingZip ?? null,
          country: dbUser?.shippingCountry ?? null,
        },
      },
      select: { id: true },
    });

    console.log("ORDER CREATED BEFORE CHECKOUT:", {
      orderId: order.id,
      userId,
      sessionEmail,
      pricingTotalWithoutVat: pricing.total,
      accountType: dbUser?.accountType ?? null,
      companyName: dbUser?.companyName ?? null,
    });

    const baseUrl = getBaseUrl(req);
    const totalWithVat = addVat(pricing.total);
    const itemAmountCents = Math.round(totalWithVat * 100);

    console.log("CHECKOUT PRICE DEBUG:", {
      orderId: order.id,
      totalWithoutVat: pricing.total,
      totalWithVat,
      itemAmountCents,
      quantity,
      scalePct,
      infillPct,
    });

    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: order.id,

      billing_address_collection: "required",

      phone_number_collection: {
        enabled: true,
      },

      shipping_address_collection: {
        allowed_countries: ["SK", "CZ"],
      },

      shipping_options: [
        {
          shipping_rate_data: {
            display_name: "Packeta / Zásielkovňa",
            type: "fixed_amount",
            fixed_amount: {
              amount: 399,
              currency: "eur",
            },
            delivery_estimate: {
              minimum: { unit: "business_day", value: 1 },
              maximum: { unit: "business_day", value: 3 },
            },
          },
        },
        {
          shipping_rate_data: {
            display_name: "Kuriér",
            type: "fixed_amount",
            fixed_amount: {
              amount: 599,
              currency: "eur",
            },
            delivery_estimate: {
              minimum: { unit: "business_day", value: 1 },
              maximum: { unit: "business_day", value: 2 },
            },
          },
        },
      ],

      customer_email: sessionEmail ?? dbUser?.email ?? undefined,

      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: itemAmountCents,
            product_data: {
              name: `3D tlač: ${body.uploaded.fileName}`,
              description: `${formatEur(totalWithVat)} s DPH • mierka ${scalePct}%`,
              metadata: {
                orderId: order.id,
              },
            },
          },
        },
      ],

      metadata: {
        orderId: order.id,
        scalePct: String(scalePct),
        userId: userId ?? "",
        customerEmail: sessionEmail ?? dbUser?.email ?? "",
        isTestOrder: "false",

        accountType: dbUser?.accountType ?? "",
        phone: dbUser?.phone ?? "",

        companyName: dbUser?.companyName ?? "",
        ico: dbUser?.ico ?? "",
        dic: dbUser?.dic ?? "",
        icDph: dbUser?.icDph ?? "",
        contactPerson: dbUser?.contactPerson ?? "",

        billingStreet: dbUser?.billingStreet ?? "",
        billingCity: dbUser?.billingCity ?? "",
        billingZip: dbUser?.billingZip ?? "",
        billingCountry: dbUser?.billingCountry ?? "",

        shippingName: dbUser?.shippingName ?? "",
        shippingContact: dbUser?.shippingContact ?? "",
        shippingStreet: dbUser?.shippingStreet ?? "",
        shippingCity: dbUser?.shippingCity ?? "",
        shippingZip: dbUser?.shippingZip ?? "",
        shippingCountry: dbUser?.shippingCountry ?? "",
      },

      payment_intent_data: {
        metadata: {
          orderId: order.id,
          scalePct: String(scalePct),
          userId: userId ?? "",
          customerEmail: sessionEmail ?? dbUser?.email ?? "",
          isTestOrder: "false",

          accountType: dbUser?.accountType ?? "",
          companyName: dbUser?.companyName ?? "",
          ico: dbUser?.ico ?? "",
          dic: dbUser?.dic ?? "",
          icDph: dbUser?.icDph ?? "",
        },
      },

      success_url: `${baseUrl}/success?orderId=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel?orderId=${order.id}`,
    });

    console.log("STRIPE SESSION CREATED:", {
      orderId: order.id,
      sessionId: stripeSession.id,
      customerEmail: sessionEmail ?? dbUser?.email ?? null,
      totalWithVat,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        stripeSessionId: stripeSession.id,
      },
    });

    return NextResponse.json({
      url: stripeSession.url,
      orderId: order.id,
      sessionId: stripeSession.id,
      isTestOrder: false,
      checkoutTotalWithVat: totalWithVat,
      originalTotalWithVat: totalWithVat,
    });
  } catch (e: any) {
    console.error("create-checkout-session error:", e);

    return NextResponse.json(
      { error: e?.message || "Checkout failed" },
      { status: 500 }
    );
  }
}