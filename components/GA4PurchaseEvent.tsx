"use client";

import { useEffect } from "react";
import { VAT_RATE } from "@/lib/vat";

type OrderItemInput = {
  fileName: string;
  config: Record<string, any> | null;
  pricing: Record<string, any> | null;
};

type Props = {
  orderNumber: string | null;
  paidTotalEur: number | null;
  shippingEur: number | null;
  items: OrderItemInput[];
};

declare global {
  interface Window {
    dataLayer: Record<string, any>[];
  }
}

// Fires once per confirmed order: pushes a GA4 "purchase" ecommerce event
// built from the real OrderItem rows (a paid order can contain several
// different 3D models, each with its own material/quality/price).
export default function GA4PurchaseEvent({
  orderNumber,
  paidTotalEur,
  shippingEur,
  items,
}: Props) {
  useEffect(() => {
    if (!orderNumber || !paidTotalEur || items.length === 0) return;

    // Guard against a duplicate push if the customer refreshes this page.
    const storageKey = `ga4_purchase_${orderNumber}`;
    if (sessionStorage.getItem(storageKey)) return;

    // paidTotalEur is the Stripe amount_total — VAT-inclusive, shipping included.
    const vatAmount = Math.round((paidTotalEur - paidTotalEur / (1 + VAT_RATE)) * 100) / 100;

    const ga4Items = items.map((item) => {
      const config = item.config ?? {};
      const material = String(config.material ?? "PLA");
      const quality = String(config.quality ?? "STANDARD");
      const quantity = Math.max(1, Number(config.quantity ?? 1));

      // pricing.total is the ex-VAT line total for this item (all units).
      const lineTotalExVat = Number(item.pricing?.total ?? 0);
      const unitPrice = Math.round((lineTotalExVat / quantity) * 100) / 100;

      return {
        item_id: `3D_TLAC_${material}_${quality}`,
        item_name: `3D tlač: ${item.fileName}`,
        item_category: "3D Tlač",
        item_category2: material,
        item_category3: quality,
        price: unitPrice,
        quantity,
        currency: "EUR",
      };
    });

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({
      event: "purchase",
      ecommerce: {
        transaction_id: orderNumber,
        value: paidTotalEur,
        tax: vatAmount,
        shipping: shippingEur ?? 0,
        currency: "EUR",
        items: ga4Items,
      },
    });

    sessionStorage.setItem(storageKey, "1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
