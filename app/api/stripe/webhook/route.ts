import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { markOrderPaidFromCheckoutSession } from "@/lib/order-fulfillment";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover",
});

export async function POST(req: NextRequest) {
  try {
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

    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
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

      const orderId =
        session.metadata?.orderId ?? session.client_reference_id ?? null;

      if (!orderId) {
        console.error("Webhook missing orderId in metadata");
        return NextResponse.json({ received: true });
      }

      // Stripe can and does redeliver the same event; without this guard a
      // redelivery would re-send both the customer and admin emails.
      const existingOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: { status: true },
      });

      if (!existingOrder) {
        console.error("Webhook order not found:", orderId);
        return NextResponse.json({ received: true });
      }

      if (existingOrder.status !== "PENDING") {
        console.log("Webhook: order already processed, skipping:", orderId, existingOrder.status);
        return NextResponse.json({ received: true });
      }

      await markOrderPaidFromCheckoutSession(stripe, orderId, session.id);
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
