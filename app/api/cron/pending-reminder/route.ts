import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { sendPendingReminderEmail } from "@/lib/email-reminder";
import { sendOrderStatusEmail } from "@/lib/email-status";
import { markOrderPaidFromCheckoutSession } from "@/lib/order-fulfillment";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Stripe Checkout Sessions expire after 24h by default, so by this point an
// unpaid PENDING order can no longer be paid via its original link.
const CARD_ABANDON_HOURS = 48;
// Bank transfers can legitimately take several business days; give a wide
// grace period before treating an unpaid transfer order as abandoned.
const TRANSFER_ABANDON_DAYS = 14;

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const cardAbandonCutoff = new Date(now.getTime() - CARD_ABANDON_HOURS * 60 * 60 * 1000);
  const transferAbandonCutoff = new Date(now.getTime() - TRANSFER_ABANDON_DAYS * 24 * 60 * 60 * 1000);

  let sent = 0;
  let skipped = 0;
  let reconciled = 0;
  let cancelled = 0;

  // 1) Send a one-time reminder for orders that have been sitting unpaid for 1-24h.
  const reminderCandidates = await prisma.order.findMany({
    where: {
      status: "PENDING",
      reminderSentAt: null,
      customerEmail: { not: null },
      stripeSessionId: { not: null },
      createdAt: {
        gte: twentyFourHoursAgo,
        lte: oneHourAgo,
      },
    },
    select: {
      id: true,
      customerEmail: true,
      fileName: true,
      stripeSessionId: true,
    },
  });

  for (const order of reminderCandidates) {
    try {
      const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId!);

      // Safety net: the webhook can occasionally fail to fire/land. If Stripe
      // says this session was actually paid but our order never got marked
      // PAID, reconcile it now instead of nagging the customer to pay again.
      if (session.payment_status === "paid") {
        await markOrderPaidFromCheckoutSession(stripe, order.id, order.stripeSessionId!);
        reconciled++;
        continue;
      }

      if (session.status !== "open" || !session.url) {
        await prisma.order.update({
          where: { id: order.id },
          data: { reminderSentAt: now },
        });
        skipped++;
        continue;
      }

      await sendPendingReminderEmail({
        to: order.customerEmail!,
        orderId: order.id,
        fileName: order.fileName,
        stripeUrl: session.url,
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { reminderSentAt: now },
      });

      sent++;
    } catch (err) {
      console.error(`Reminder failed for order ${order.id}:`, err);
    }
  }

  // 2) Auto-cancel card orders that have been unpaid long enough that their
  // Stripe Checkout Session has definitely expired. This only changes the
  // order's status to CANCELLED — nothing is ever deleted.
  const staleCardOrders = await prisma.order.findMany({
    where: {
      status: "PENDING",
      stripeSessionId: { not: null },
      createdAt: { lte: cardAbandonCutoff },
    },
    select: { id: true, customerEmail: true, fileName: true, stripeSessionId: true },
  });

  for (const order of staleCardOrders) {
    try {
      const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId!);

      if (session.payment_status === "paid") {
        await markOrderPaidFromCheckoutSession(stripe, order.id, order.stripeSessionId!);
        reconciled++;
        continue;
      }

      if (session.status === "expired") {
        await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
        if (order.customerEmail) {
          try {
            await sendOrderStatusEmail({
              to: order.customerEmail,
              orderId: order.id,
              fileName: order.fileName,
              status: "CANCELLED",
            });
          } catch (emailErr) {
            console.error(`Cancellation email failed for order ${order.id}:`, emailErr);
          }
        }
        cancelled++;
      }
    } catch (err) {
      console.error(`Auto-cancel check failed for order ${order.id}:`, err);
    }
  }

  // 3) Auto-cancel bank-transfer orders that have sat unpaid well beyond a
  // reasonable transfer window. Status only — no record is ever deleted.
  const staleTransferOrders = await prisma.order.findMany({
    where: {
      status: "AWAITING_TRANSFER",
      createdAt: { lte: transferAbandonCutoff },
    },
    select: { id: true, customerEmail: true, fileName: true },
  });

  for (const order of staleTransferOrders) {
    try {
      await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
      if (order.customerEmail) {
        try {
          await sendOrderStatusEmail({
            to: order.customerEmail,
            orderId: order.id,
            fileName: order.fileName,
            status: "CANCELLED",
          });
        } catch (emailErr) {
          console.error(`Cancellation email failed for order ${order.id}:`, emailErr);
        }
      }
      cancelled++;
    } catch (err) {
      console.error(`Auto-cancel failed for transfer order ${order.id}:`, err);
    }
  }

  return NextResponse.json({
    sent,
    skipped,
    reconciled,
    cancelled,
    reminderCandidates: reminderCandidates.length,
    staleCardOrders: staleCardOrders.length,
    staleTransferOrders: staleTransferOrders.length,
  });
}
