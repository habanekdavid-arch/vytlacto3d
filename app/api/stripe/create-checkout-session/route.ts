import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { quote } from "@/lib/pricing";
import { addVat, formatEur } from "@/lib/vat";

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
      return NextResponse.json(
        { error: "Missing config" },
        { status: 400 }
      );
    }

    const volumeCm3 = Number(body.uploaded.analysis.volumeCm3);
    const quantity = Number(body.config.quantity ?? 1);
    const infillPct = Number(body.config.infillPct ?? body.config.strength ?? 20);

    if (!Number.isFinite(volumeCm3) || volumeCm3 <= 0) {
      return NextResponse.json({ error: "Invalid volumeCm3" }, { status: 400 });
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json({ error: "Quantity must be >= 1" }, { status: 400 });
    }

    if (!Number.isFinite(infillPct) || infillPct < 0 || infillPct > 100) {
      return NextResponse.json({ error: "Invalid infillPct" }, { status: 400 });
    }

    const pricing = quote({
      volumeCm3,
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
        analysis: body.uploaded.analysis,
        config: {
          ...body.config,
          infillPct,
        },
        pricing: pricing as any,
      },
      select: { id: true },
    });

    const baseUrl = getBaseUrl(req);
    const totalWithVat = addVat(pricing.total);
    const itemAmountCents = Math.round(totalWithVat * 100);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      billing_address_collection: "auto",
      shipping_address_collection: {
        allowed_countries: ["SK", "CZ"],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            display_name: "Packeta / Zásielkovňa",
            type: "fixed_amount",
            fixed_amount: { amount: 399, currency: "eur" },
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
            fixed_amount: { amount: 599, currency: "eur" },
            delivery_estimate: {
              minimum: { unit: "business_day", value: 1 },
              maximum: { unit: "business_day", value: 2 },
            },
          },
        },
      ],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: itemAmountCents,
            product_data: {
              name: `3D tlač: ${body.uploaded.fileName}`,
              description: `${formatEur(totalWithVat)} s DPH`,
            },
          },
        },
      ],
      metadata: {
        orderId: order.id,
      },
      payment_intent_data: {
        metadata: {
          orderId: order.id,
        },
      },
      success_url: `${baseUrl}/success?orderId=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel?orderId=${order.id}`,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        stripeSessionId: session.id,
      },
    });

    return NextResponse.json({
      url: session.url,
      orderId: order.id,
      sessionId: session.id,
    });
  } catch (e: any) {
    console.error("create-checkout-session error:", e);
    return NextResponse.json(
      { error: e?.message || "Checkout failed" },
      { status: 500 }
    );
  }
}