import type { Order, OrderItem } from "@prisma/client";
import { formatEur, addVat } from "@/lib/vat";
import { formatDateSK } from "@/lib/formatDate";
import { colorLabel, materialLabel, qualityLabel } from "@/lib/print-options";

export type OrderWithItems = Order & { orderItems: OrderItem[] };

type Obj = Record<string, any>;

function v(val: any) {
  return val === null || val === undefined || val === "" ? "—" : String(val);
}

/**
 * Textový prehľad objednávky — tlačidlo "Kopírovať objednávku" v administrácii
 * aj popis zákazky vo FLOWii. Oba musia zostať rovnaké, preto jeden zdroj.
 */
export function buildOrderCopyText(order: OrderWithItems): string {
  const analysis = (order.analysis ?? {}) as Obj;
  const config = (order.config ?? {}) as Obj;
  const pricing = (order.pricing ?? {}) as Obj;

  const shippingCost = (order.shippingCost ?? {}) as Obj;
  const rawDelivery = (order.deliveryAddress ?? {}) as Obj;
  const rawShipping = (order.shippingAddress ?? {}) as Obj;
  const billingAddress = (order.billingAddress ?? {}) as Obj;
  const deliveryAddress = {
    name: rawDelivery.name ?? rawShipping.name ?? billingAddress.name ?? null,
    phone: rawDelivery.phone ?? rawShipping.phone ?? billingAddress.phone ?? order.phone ?? null,
    street: rawDelivery.street ?? rawShipping.street ?? billingAddress.street ?? billingAddress.line1 ?? null,
    line2: rawDelivery.line2 ?? rawShipping.line2 ?? billingAddress.line2 ?? null,
    city: rawDelivery.city ?? rawShipping.city ?? billingAddress.city ?? null,
    zip: rawDelivery.zip ?? rawShipping.zip ?? billingAddress.zip ?? billingAddress.postal_code ?? null,
    country: rawDelivery.country ?? rawShipping.country ?? billingAddress.country ?? null,
  };

  const shippingCostEur =
    typeof shippingCost.amount === "number" ? shippingCost.amount / 100 : null;
  const paidTotal =
    typeof order.paidTotalEur === "number" ? order.paidTotalEur : null;
  const productionGross =
    paidTotal !== null
      ? paidTotal - (shippingCostEur ?? 0)
      : typeof pricing.total === "number"
      ? addVat(pricing.total)
      : null;

  const sep = "─────────────────────────────────────────";
  return [
    "═".repeat(45),
    `  OBJEDNÁVKA: ${v(order.orderNumber ?? order.id)}`,
    `  Stav: ${v(order.status)}`,
    "═".repeat(45),
    "",
    "ZÁKLADNÉ INFORMÁCIE",
    sep,
    `  Číslo objednávky : ${v(order.orderNumber)}`,
    `  ID               : ${v(order.id)}`,
    `  Dátum            : ${formatDateSK(order.createdAt)}`,
    `  Súbor            : ${v(order.fileName)}`,
    `  Celkom zaplatené : ${paidTotal !== null ? formatEur(paidTotal) : "—"}`,
    `  Doprava          : ${v(order.shippingMethod)}`,
    `  Cena dopravy     : ${shippingCostEur !== null ? formatEur(shippingCostEur) : "—"}`,
    ...(config.allowModelAdjustments ? [`  Úprava modelu    : Zákazník súhlasí s miernou úpravou pre lepšiu kvalitu tlače`] : []),
    "",
    "ZÁKAZNÍK",
    sep,
    `  Email      : ${v(order.customerEmail)}`,
    `  Telefón    : ${v(deliveryAddress.phone ?? order.phone)}`,
    `  Typ účtu   : ${order.accountType === "COMPANY" ? "Firma" : order.accountType === "PERSON" ? "Súkromná osoba" : "—"}`,
    ...(order.accountType === "COMPANY" ? [
      "",
      "FIREMNÉ ÚDAJE",
      sep,
      `  Spoločnosť     : ${v(order.companyName)}`,
      `  Kontaktná os.  : ${v(order.contactPerson)}`,
      `  IČO            : ${v(order.ico)}`,
      `  DIČ            : ${v(order.dic)}`,
      `  IČ DPH         : ${v(order.icDph)}`,
    ] : []),
    "",
    "ADRESA DORUČENIA",
    sep,
    `  Meno    : ${v(deliveryAddress.name)}`,
    `  Ulica   : ${v(deliveryAddress.street)}${deliveryAddress.line2 ? `, ${deliveryAddress.line2}` : ""}`,
    `  Mesto   : ${v(deliveryAddress.city)}`,
    `  PSČ     : ${v(deliveryAddress.zip)}`,
    `  Krajina : ${v(deliveryAddress.country)}`,
    "",
    ...(order.orderItems.length > 0
      ? [
          `MODELY V OBJEDNÁVKE (${order.orderItems.length})`,
          sep,
          ...order.orderItems.flatMap((oi, idx) => {
            const ic = oi.config as Obj;
            const ip = oi.pricing as Obj;
            const ia = oi.analysis as Obj;
            return [
              `  [${idx + 1}] ${oi.fileName}`,
              `      Materiál : ${materialLabel(ic.material)}  Kvalita: ${qualityLabel(ic.quality)}  Farba: ${colorLabel(ic.color)}`,
              `      Množstvo : ${v(ic.quantity)} ks  Infill: ${ic.infillPct ?? "—"}%  Mierka: ${ic.scalePct ?? 100}%`,
              `      Rozmery  : ${ia?.dimsXmm !== undefined ? `${Number(ia.dimsXmm).toFixed(0)}×${Number(ia.dimsYmm).toFixed(0)}×${Number(ia.dimsZmm).toFixed(0)} mm` : "—"}  Objem: ${ia?.volumeCm3 !== undefined ? `${Number(ia.volumeCm3).toFixed(2)} cm³` : "—"}`,
              ...(ic.materialFlexible ? ["      Materiál : zákazníkovi nezáleží (−1 €)"] : []),
              ...(ic.colorFlexible ? ["      Farba    : zákazníkovi nezáleží (−1 €)"] : []),
              ...(typeof ip.gramsPerPart === "number" ? [`      Materiál : ${ip.gramsPerPart.toFixed(1)} g/ks  Čas: ${Math.round(ip.printTimeMinPerPart ?? 0)} min/ks`] : []),
              ...(typeof ip.total === "number" ? [`      Cena     : ${formatEur(ip.total)} bez DPH  |  ${formatEur(addVat(ip.total))} s DPH`] : []),
              "",
            ];
          }),
        ]
      : [
          "KONFIGURÁCIA TLAČE",
          sep,
          `  Materiál    : ${materialLabel(config.material)}`,
          `  Kvalita     : ${qualityLabel(config.quality)}`,
          `  Farba       : ${colorLabel(config.color)}`,
          `  Počet kusov : ${v(config.quantity)}`,
          `  Infill      : ${config.infillPct !== undefined ? `${config.infillPct}%` : "—"}`,
          `  Mierka      : ${config.scalePct !== undefined ? `${config.scalePct}%` : "—"}`,
          ...(config.materialFlexible ? ["  Materiál    : zákazníkovi nezáleží (−1 €)"] : []),
          ...(config.colorFlexible ? ["  Farba       : zákazníkovi nezáleží (−1 €)"] : []),
          "",
          "ANALÝZA MODELU",
          sep,
          `  Rozmer X : ${analysis.dimsXmm !== undefined ? `${analysis.dimsXmm} mm` : "—"}`,
          `  Rozmer Y : ${analysis.dimsYmm !== undefined ? `${analysis.dimsYmm} mm` : "—"}`,
          `  Rozmer Z : ${analysis.dimsZmm !== undefined ? `${analysis.dimsZmm} mm` : "—"}`,
          `  Objem    : ${analysis.volumeCm3 !== undefined ? `${analysis.volumeCm3} cm³` : "—"}`,
          "",
        ]
    ),
    "CENOVÝ ROZPIS",
    sep,
    ...(productionGross !== null ? [
      `  Základ bez DPH : ${formatEur(productionGross / 1.23)}`,
      `  DPH 23 %       : ${formatEur(productionGross - productionGross / 1.23)}`,
      `  Výroba s DPH   : ${formatEur(productionGross)}`,
    ] : []),
    `  Doprava        : ${shippingCostEur !== null ? formatEur(shippingCostEur) : "—"}`,
    `  CELKOM         : ${paidTotal !== null ? formatEur(paidTotal) : "—"}`,
    "",
    "═".repeat(45),
  ].join("\n");
}
