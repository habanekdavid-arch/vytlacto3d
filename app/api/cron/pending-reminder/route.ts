import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { sendPendingReminderEmail } from "@/lib/email-reminder";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
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

  let sent = 0;
  let skipped = 0;

  for (const order of orders) {
    try {
      const session = await stripe.checkout.sessions.retrieve(
        order.stripeSessionId!
      );

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

  return NextResponse.json({ sent, skipped, total: orders.length });
}
