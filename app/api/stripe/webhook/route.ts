import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { sendOrderPaidEmail } from "@/lib/email";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover",
});

function getShippingMethod(session: Stripe.Checkout.Session) {
  const shippingRate = session.shipping_cost?.shipping_rate;

  if (!shippingRate) return null;

  if (typeof shippingRate === "string") {
    return shippingRate;
  }

  if ("display_name" in shippingRate && shippingRate.display_name) {
    return shippingRate.display_name;
  }

  return shippingRate.id ?? null;
}

function getShippingAddress(session: Stripe.Checkout.Session) {
  const customer = session.customer_details;

  if (!customer?.address) return null;

  return {
    name: customer.name ?? null,
    line1: customer.address.line1 ?? null,
    line2: customer.address.line2 ?? null,
    city: customer.address.city ?? null,
    postal_code: customer.address.postal_code ?? null,
    state: customer.address.state ?? null,
    country: customer.address.country ?? null,
  };
}

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

      const orderId = session.metadata?.orderId;
      if (!orderId) {
        console.error("Webhook missing orderId in metadata");
        return NextResponse.json({ received: true });
      }

      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["shipping_cost.shipping_rate"],
      });

      const amountTotal =
        typeof fullSession.amount_total === "number"
          ? fullSession.amount_total / 100
          : null;

      const shippingMethod = getShippingMethod(fullSession);
      const shippingAddress = getShippingAddress(fullSession);

      const updatedOrder = await prisma.order.update({
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
          shippingAddress: shippingAddress as any,
        },
        select: {
          id: true,
          fileName: true,
          customerEmail: true,
          paidTotalEur: true,
          shippingMethod: true,
        },
      });

      if (updatedOrder.customerEmail) {
        try {
          await sendOrderPaidEmail({
            to: updatedOrder.customerEmail,
            orderId: updatedOrder.id,
            fileName: updatedOrder.fileName,
            totalEur: updatedOrder.paidTotalEur,
            shippingMethod: updatedOrder.shippingMethod,
          });
        } catch (emailError) {
          console.error("Failed to send order email:", emailError);
        }
      }

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