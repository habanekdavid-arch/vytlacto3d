import Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { sendOrderPaidEmail } from "@/lib/email";
import { sendAdminOrderNotificationEmail } from "@/lib/email-admin";

function getShippingMethod(session: Stripe.Checkout.Session) {
  const shippingRate = session.shipping_cost?.shipping_rate as any;

  if (!shippingRate) return null;
  if (typeof shippingRate === "string") return shippingRate;

  return shippingRate.display_name ?? shippingRate.id ?? null;
}

function getShippingAddress(session: Stripe.Checkout.Session) {
  const shipping = (session as any).shipping_details;

  if (!shipping?.address) return null;

  return {
    name: shipping.name ?? null,
    phone: shipping.phone ?? null,
    street: shipping.address.line1 ?? null,
    line2: shipping.address.line2 ?? null,
    city: shipping.address.city ?? null,
    zip: shipping.address.postal_code ?? null,
    state: shipping.address.state ?? null,
    country: shipping.address.country ?? null,
  };
}

function getBillingAddress(session: Stripe.Checkout.Session) {
  const customer = session.customer_details;

  if (!customer?.address) return null;

  return {
    name: customer.name ?? null,
    email: customer.email ?? null,
    phone: customer.phone ?? null,
    street: customer.address.line1 ?? null,
    line2: customer.address.line2 ?? null,
    city: customer.address.city ?? null,
    zip: customer.address.postal_code ?? null,
    state: customer.address.state ?? null,
    country: customer.address.country ?? null,
  };
}

function getShippingCost(session: Stripe.Checkout.Session) {
  if (!session.shipping_cost) return null;

  return {
    amount: session.shipping_cost.amount_total ?? 0,
    currency: session.currency ?? "eur",
  };
}

function getCustomerPhone(session: Stripe.Checkout.Session) {
  return (
    session.customer_details?.phone ??
    (session as any).shipping_details?.phone ??
    null
  );
}

/**
 * Marks an order PAID from a completed Stripe Checkout Session and sends the
 * customer + admin confirmation emails. Shared by the webhook (primary path)
 * and the reconciliation cron (safety net for missed/failed webhook deliveries).
 * Caller must have already verified the order is still PENDING.
 */
export async function markOrderPaidFromCheckoutSession(
  stripe: Stripe,
  orderId: string,
  sessionId: string
) {
  const fullSession = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["shipping_cost.shipping_rate"],
  });

  const amountTotal =
    typeof fullSession.amount_total === "number"
      ? fullSession.amount_total / 100
      : null;

  const customerEmail =
    fullSession.customer_details?.email ??
    fullSession.customer_email ??
    fullSession.metadata?.customerEmail ??
    null;

  const customerPhone = getCustomerPhone(fullSession);
  const shippingMethod = getShippingMethod(fullSession);
  const shippingAddress = getShippingAddress(fullSession);
  const billingAddress = getBillingAddress(fullSession);
  const shippingCost = getShippingCost(fullSession);

  const isPacketa = fullSession.metadata?.deliveryMethod === "packeta";
  const packetaDeliveryAddress = isPacketa && fullSession.metadata?.packetaPointId
    ? {
        type: "packeta",
        packetaPointId: fullSession.metadata.packetaPointId,
        packetaPointName: fullSession.metadata.packetaPointName ?? null,
        street: fullSession.metadata.packetaStreet ?? null,
        city: fullSession.metadata.packetaCity ?? null,
        zip: fullSession.metadata.packetaZip ?? null,
        country: "SK",
      }
    : null;

  const matchedUser = customerEmail
    ? await prisma.user.findUnique({
        where: { email: customerEmail },
        select: {
          id: true,
          accountType: true,
          phone: true,
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

  const accountBillingAddress = matchedUser
    ? {
        street: matchedUser.billingStreet ?? null,
        city: matchedUser.billingCity ?? null,
        zip: matchedUser.billingZip ?? null,
        country: matchedUser.billingCountry ?? null,
      }
    : null;

  const accountDeliveryAddress = matchedUser
    ? {
        name: matchedUser.shippingName ?? null,
        contact: matchedUser.shippingContact ?? null,
        street: matchedUser.shippingStreet ?? null,
        city: matchedUser.shippingCity ?? null,
        zip: matchedUser.shippingZip ?? null,
        country: matchedUser.shippingCountry ?? null,
      }
    : null;

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "PAID",
      customerEmail,
      phone: customerPhone ?? matchedUser?.phone ?? null,
      paidTotalEur: amountTotal,

      stripeSessionId: fullSession.id,
      stripePaymentIntentId:
        typeof fullSession.payment_intent === "string"
          ? fullSession.payment_intent
          : fullSession.payment_intent?.id ?? null,

      shippingMethod,
      shippingAddress: shippingAddress as any,
      shippingCost: shippingCost as any,

      billingAddress: (billingAddress ?? accountBillingAddress) as any,
      deliveryAddress: (packetaDeliveryAddress ?? shippingAddress ?? billingAddress ?? accountDeliveryAddress) as any,

      accountType: matchedUser?.accountType ?? null,
      companyName: matchedUser?.companyName ?? null,
      ico: matchedUser?.ico ?? null,
      dic: matchedUser?.dic ?? null,
      icDph: matchedUser?.icDph ?? null,
      contactPerson: matchedUser?.contactPerson ?? null,

      userId: matchedUser?.id ?? undefined,
    },
    select: {
      id: true,
      orderNumber: true,
      fileName: true,
      customerEmail: true,
      paidTotalEur: true,
      shippingMethod: true,
      phone: true,
      accountType: true,
      companyName: true,
      ico: true,
      dic: true,
      icDph: true,
      contactPerson: true,
      deliveryAddress: true,
      config: true,
      pricing: true,
      shippingCost: true,
      createdAt: true,
      userId: true,
    },
  });

  const shippingCostEur =
    typeof (updatedOrder.shippingCost as any)?.amount === "number"
      ? (updatedOrder.shippingCost as any).amount / 100
      : null;

  if (updatedOrder.customerEmail) {
    try {
      await sendOrderPaidEmail({
        to: updatedOrder.customerEmail,
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        fileName: updatedOrder.fileName,
        totalEur: updatedOrder.paidTotalEur,
        shippingMethod: updatedOrder.shippingMethod,
        shippingCostEur,
        deliveryAddress: updatedOrder.deliveryAddress as any,
        config: updatedOrder.config as any,
        pricing: updatedOrder.pricing as any,
      });
    } catch (customerEmailError) {
      console.error("Failed to send customer order email:", customerEmailError);
    }
  }

  try {
    await sendAdminOrderNotificationEmail({
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      fileName: updatedOrder.fileName,
      customerEmail: updatedOrder.customerEmail,
      totalEur: updatedOrder.paidTotalEur,
      shippingMethod: updatedOrder.shippingMethod,
      shippingCostEur,
      phone: updatedOrder.phone,
      accountType: updatedOrder.accountType,
      companyName: updatedOrder.companyName,
      ico: updatedOrder.ico,
      dic: updatedOrder.dic,
      icDph: updatedOrder.icDph,
      contactPerson: updatedOrder.contactPerson,
      deliveryAddress: updatedOrder.deliveryAddress as any,
      config: updatedOrder.config as any,
      pricing: updatedOrder.pricing as any,
      createdAt: updatedOrder.createdAt,
    });
  } catch (adminEmailError) {
    console.error("Failed to send admin order email:", adminEmailError);
  }

  const sessionStripeCustomerId = fullSession.customer as string | null;
  if (sessionStripeCustomerId && matchedUser?.id) {
    await prisma.user.updateMany({
      where: { id: matchedUser.id, stripeCustomerId: null },
      data: { stripeCustomerId: sessionStripeCustomerId },
    });
  }

  console.log("Order marked as PAID:", {
    orderId,
    userId: updatedOrder.userId,
    customerEmail: updatedOrder.customerEmail,
  });

  return updatedOrder;
}
