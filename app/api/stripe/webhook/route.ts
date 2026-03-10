import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

async function sendOrderPaidEmail({
  to,
  orderId,
  fileName,
  paidTotalEur,
  shippingMethod,
}: {
  to: string;
  orderId: string;
  fileName: string;
  paidTotalEur: number | null;
  shippingMethod: string | null;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.ORDER_FROM_EMAIL;

  if (!resendApiKey || !fromEmail) {
    console.log("Email not sent: missing RESEND_API_KEY or ORDER_FROM_EMAIL");
    return;
  }

  const totalText =
    typeof paidTotalEur === "number"
      ? `${paidTotalEur.toFixed(2).replace(".", ",")} €`
      : "—";

  const shippingText = shippingMethod || "Podľa checkoutu";

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
      <h2 style="margin-bottom: 12px;">Ďakujeme za objednávku</h2>
      <p>Vaša objednávka bola úspešne zaplatená.</p>

      <div style="margin: 20px 0; padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <p><strong>ID objednávky:</strong> ${orderId}</p>
        <p><strong>Model:</strong> ${fileName}</p>
        <p><strong>Zaplatená suma:</strong> ${totalText}</p>
        <p><strong>Doprava:</strong> ${shippingText}</p>
      </div>

      <p>Ďalší stav objednávky vám potvrdíme po spracovaní.</p>
      <p>VytlačTo3D / 4from media, s.r.o.</p>
    </div>
  `;

  const text = [
    "Ďakujeme za objednávku.",
    `ID objednávky: ${orderId}`,
    `Model: ${fileName}`,
    `Zaplatená suma: ${totalText}`,
    `Doprava: ${shippingText}`,
    "",
    "VytlačTo3D / 4from media, s.r.o.",
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject: `Potvrdenie objednávky ${orderId}`,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("Resend error:", body);
  }
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature" },
      { status: 400 }
    );
  }

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature error:", err?.message);
    return NextResponse.json(
      { error: `Invalid signature: ${err?.message || "unknown"}` },
      { status: 400 }
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const orderId = session.metadata?.orderId;
      if (!orderId) {
        return NextResponse.json(
          { error: "Missing orderId in metadata" },
          { status: 400 }
        );
      }

      const full = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["shipping_cost.shipping_rate", "payment_intent"],
      });

      const shippingDetails = (full as any).shipping_details ?? null;
      const shippingCost = (full as any).shipping_cost ?? null;
      const shippingMethod =
        ((full as any).shipping_cost?.shipping_rate?.display_name as
          | string
          | undefined) ?? null;

      const paidTotalEur =
        typeof full.amount_total === "number" ? full.amount_total / 100 : null;

      const paymentIntentId =
        typeof full.payment_intent === "string"
          ? full.payment_intent
          : full.payment_intent?.id ?? null;

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "PAID",
          stripeSessionId: full.id,
          stripePaymentIntentId: paymentIntentId,
          customerEmail: full.customer_details?.email ?? null,
          paidTotalEur,
          shippingAddress: shippingDetails,
          shippingCost,
          shippingMethod,
        },
      });

      console.log(`✅ Order ${orderId} marked as PAID`);

      if (updatedOrder.customerEmail) {
        await sendOrderPaidEmail({
          to: updatedOrder.customerEmail,
          orderId: updatedOrder.id,
          fileName: updatedOrder.fileName,
          paidTotalEur: updatedOrder.paidTotalEur,
          shippingMethod: updatedOrder.shippingMethod,
        });
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "CANCELED",
          },
        });

        console.log(`ℹ️ Order ${orderId} marked as CANCELED`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("Webhook DB error:", e);
    return NextResponse.json(
      { error: e?.message || "Webhook failed" },
      { status: 500 }
    );
  }
}