import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover",
});

function getShippingMethod(session: Stripe.Checkout.Session) {
  const shippingOption = session.shipping_cost?.shipping_rate;

  if (!shippingOption) return null;

  if (typeof shippingOption === "string") {
    return shippingOption;
  }

  return shippingOption.id ?? null;
}

function getShippingAddress(session: Stripe.Checkout.Session) {
  const details = session.collected_information?.shipping_details;

  if (!details?.address) return null;

  return {
    name: details.name ?? null,
    line1: details.address.line1 ?? null,
    line2: details.address.line2 ?? null,
    city: details.address.city ?? null,
    postal_code: details.address.postal_code ?? null,
    state: details.address.state ?? null,
    country: details.address.country ?? null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: "Missing STRIPE_WEBHOOK_SECRET" },
        { status: 500 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY" },
        { status: 500 }
      );
    }

    const body = await req.text();

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err?.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err?.message}` },
        { status: 400 }
      );
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const orderId = session.metadata?.orderId;
      if (!orderId) {
        console.error("Missing orderId in checkout session metadata");
        return NextResponse.json({ received: true });
      }

      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["shipping_cost.shipping_rate"],
      });

      const amountTotal =
        typeof fullSession.amount_total === "number"
          ? fullSession.amount_total / 100
          : null;

      const shippingCost =
        typeof fullSession.shipping_cost?.amount_total === "number"
          ? fullSession.shipping_cost.amount_total / 100
          : null;

      const shippingMethod = getShippingMethod(fullSession);
      const shippingAddress = getShippingAddress(fullSession);

     await prisma.order.update({
  where: { id: orderId },
  data: {
    status: "PAID",
    customerEmail: fullSession.customer_details?.email ?? null,
    paidTotalEur: amountTotal,
    stripeSessionId: fullSession.id,
    stripePaymentIntentId:
      typeof fullSession.payment_intent === "string"
        ? fullSession.payment_intent
        : fullSession.payment_intent?.id ?? null,
    shippingMethod,
    shippingAddress: shippingAddress as any
  },
});

      console.log("Order marked as PAID:", orderId);
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("Stripe webhook error:", e);
    return NextResponse.json(
      { error: e?.message || "Webhook failed" },
      { status: 500 }
    );
  }
}