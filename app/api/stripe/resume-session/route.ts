import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getSafeServerSession } from "@/lib/session";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export async function POST(req: NextRequest) {
  const session = await getSafeServerSession();
  const sessionUser = session?.user as { id?: string; email?: string | null } | undefined;

  if (!sessionUser?.email) {
    return NextResponse.json({ error: "Nie si prihlásený." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const orderId = body?.orderId;

  if (!orderId) {
    return NextResponse.json({ error: "Chýba orderId." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, customerEmail: true, stripeSessionId: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Objednávka nenájdená." }, { status: 404 });
  }

  if (order.customerEmail !== sessionUser.email) {
    return NextResponse.json({ error: "Prístup zamietnutý." }, { status: 403 });
  }

  if (order.status !== "PENDING") {
    return NextResponse.json(
      { error: "Objednávka už nie je v stave PENDING." },
      { status: 400 }
    );
  }

  if (!order.stripeSessionId) {
    return NextResponse.json({ error: "Stripe session nenájdená." }, { status: 400 });
  }

  const stripeSession = await stripe.checkout.sessions.retrieve(order.stripeSessionId);

  if (stripeSession.status === "expired") {
    return NextResponse.json(
      { error: "Platobná session vypršala. Vytvor novú objednávku." },
      { status: 410 }
    );
  }

  return NextResponse.json({ url: stripeSession.url });
}
