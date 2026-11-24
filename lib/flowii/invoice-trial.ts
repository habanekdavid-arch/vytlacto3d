import { prisma } from "@/lib/prisma";
import { FlowiiClient, getFlowiiCredentials } from "@/lib/flowii/client";
import { stripe } from "@/lib/stripe";
import { colorSummary, materialLabel, qualityLabel } from "@/lib/print-options";

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Položky faktúry podľa zadania: 3D tlač (+ riadok Konfigurácia) a doprava, ceny bez DPH. */
async function invoiceLines(webOrderId: string) {
  const order = await prisma.order.findUnique({ where: { id: webOrderId }, include: { orderItems: { orderBy: { createdAt: "asc" } } } });
  if (!order) return { orderNumber: "", paidOn: new Date().toISOString().slice(0, 10), lines: [] as Line[] };
  const conf = (c: Record<string, any>) =>
    "Konfigurácia: " +
    [materialLabel(c?.material, ""), qualityLabel(c?.quality, ""), c?.infillPct != null ? `${c.infillPct}% infill` : "", colorSummary(c, "")]
      .filter(Boolean)
      .join(" • ");
  const src = order.orderItems.length > 1
    ? order.orderItems.map((oi) => ({ fileName: oi.fileName, config: oi.config as Record<string, any>, pricing: oi.pricing as Record<string, any> }))
    : [{ fileName: order.fileName, config: order.config as Record<string, any>, pricing: order.pricing as Record<string, any> }];
  const lines: Line[] = src.map((it) => {
    const qty = Math.max(1, Number(it.config?.quantity ?? 1));
    const net = typeof it.pricing?.total === "number" ? it.pricing.total : 0;
    return { name: `3D tlač: ${it.fileName}`, note: conf(it.config ?? {}), quantity: qty, unitNet: r2(net / qty) };
  });
  const ship = (order.shippingCost ?? {}) as Record<string, any>;
  const shipEur = typeof ship.amount === "number" ? ship.amount / 100 : 0;
  if (shipEur > 0) lines.push({ name: order.shippingMethod ?? "Doprava", note: "", quantity: 1, unitNet: r2(shipEur / 1.23) });
  return { orderNumber: order.orderNumber ?? "", paid: order.paidTotalEur ?? null, paidOn: await paidDate(order), lines };
}
/** Deň zaplatenia (Stripe), dátum v časovom pásme Bratislavy. Záloha: dátum objednávky. */
async function paidDate(order: { createdAt: Date; stripePaymentIntentId: string | null; stripeSessionId: string | null }) {
  let at = order.createdAt;
  try {
    if (order.stripePaymentIntentId) {
      const pi = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId, { expand: ["latest_charge"] });
      const ch = pi.latest_charge as { created?: number } | null;
      at = new Date(((ch && typeof ch === "object" && ch.created) || pi.created) * 1000);
    } else if (order.stripeSessionId) {
      at = new Date((await stripe.checkout.sessions.retrieve(order.stripeSessionId)).created * 1000);
    }
  } catch {}
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Bratislava" }).format(at); // YYYY-MM-DD
}
type Line = { name: string; note: string; quantity: number; unitNet: number };

/**
 * SKÚŠOBNÁ faktúra vo FLOWii (so súhlasom majiteľa) — zistenie tvaru
 * požiadavky POST /documents z chybových hlásení FLOWii.
 *
 * Pošle najviac 3 postupne úplnejšie pokusy a ZASTAVÍ sa pri prvom, ktorý
 * doklad vytvorí — nikdy nevzniknú dve faktúry. Zákazku ani iné záznamy
 * nemení.
 */
export async function trialFlowiiInvoice(webOrderId: string, serialNr?: string) {
  const creds = getFlowiiCredentials();
  if (!creds) return { error: "FLOWii nie je nastavené." };
  const client = new FlowiiClient(creds);
  const companies = await client.list("/companies");
  const companyId = String(process.env.FLOWII_COMPANY_ID?.trim() || companies[0]?.id || "");

  const sync = await prisma.flowiiSync.findUnique({ where: { orderId: webOrderId } }).catch(() => null);
  if (!sync?.flowiiOrderId) return { error: "Objednávka nemá zákazku vo FLOWii." };
  const order = await client.get(`/orders/${encodeURIComponent(sync.flowiiOrderId)}`, { companyId });
  const rel = order?.data?.relationships ?? {};
  const partnerId = rel.partner?.data?.id;
  const currencyId = rel.currency?.data?.id ?? "44";
  const userId = rel.user?.data?.id;
  const web = await invoiceLines(webOrderId);
  // Dátum vystavenia aj dodania = deň zaplatenia objednávky.
  const today = web.paidOn;
  const nr = serialNr && /^\d{4,12}$/.test(serialNr) ? { "serial-nr": serialNr } : {};

  // Firma (fakturačné údaje) — rovnako ako pri zakladaní zákaziek.
  const companyData = await client.list("/companydata", { companyId });
  const companyDataId = companyData.length === 1 ? companyData[0].id : (rel["company-data"]?.data?.id ?? companyData[0]?.id);
  const self = await client.get("/users/self", { companyId });
  const selfUserId = String(self?.data?.id ?? userId ?? "");

  // Kolo 2: FLOWii vyžaduje IssueDate, User, CompanyData, Partner.
  // Kolo 3: chýbali Maturity a Items. Položky ako pole v attributes (tvar sa
  // spresní podľa chybových hlásení FLOWii k jednotlivým poliam položky).
  // Kolo 4: položka vyžaduje Name, UnitPrice, UnitPriceType, VatRate.
  // Kolo 5: plochý tvar položky FLOWii nespoznal (chýbal aj Name) — skúšajú
  // sa iné tvary: JSON:API obal {type, attributes}, camelCase, PascalCase.
  const itemsFor = (shape: "jsonapi" | "camel" | "pascal", priceType = 1) =>
    web.lines.map((l) => {
      // camelCase FLOWii prijal (3026034). Druhý riadok skúšame cez note aj description.
      if (shape === "camel")
        return { name: l.name, ...(l.note ? { note: l.note, description: l.note } : {}), quantity: l.quantity, unitPrice: l.unitNet, unitPriceType: priceType, vatRate: 23 };
      if (shape === "pascal") return { Name: l.name, Quantity: l.quantity, UnitPrice: l.unitNet, UnitPriceType: priceType, VatRate: 23 };
      return {
        type: "line-item",
        attributes: { name: l.name, note: l.note, quantity: l.quantity, "unit-price": l.unitNet, "unit-price-type": priceType, "vat-rate": 23 },
      };
    });
  const maturityDate = today;
  const header = (dateKey: string, maturity: unknown, items: unknown) => ({
    data: {
      type: "document",
      attributes: {
        type: 4,
        ...nr,
        [dateKey]: today,
        "delivery-date": today,
        maturity,
        items,
        "constant-symbol": "0008",
        "order-number": web?.orderNumber ?? "",
      },
      relationships: {
        // "order" FLOWii ignoroval (3026034 nebola v zákazke) — skúša sa aj zoznam "orders".
        order: { data: { type: "order", id: String(sync.flowiiOrderId) } },
        orders: { data: [{ type: "order", id: String(sync.flowiiOrderId) }] },
        ...(partnerId ? { partner: { data: { type: "partner", id: String(partnerId) } } } : {}),
        user: { data: { type: "user", id: selfUserId } },
        "company-data": { data: { type: "company-data", id: String(companyDataId) } },
        currency: { data: { type: "currency", id: String(currencyId) } },
        "payment-method": { data: { type: "payment-method", id: "247565" } },
        "bank-account": { data: { type: "bank-account", id: "9995" } },
      },
    },
  });
  // Kolo 6: faktúra vznikla (3026034), ale väzbu "order" FLOWii ignoroval.
  // Najprv sa skúša založiť doklad priamo pod zákazkou; ak taká cesta
  // neexistuje (404/405 — nič nevznikne), pošle sa na /documents s väzbami.
  const body = header("issue-date", maturityDate, itemsFor("camel"));
  const attempts: { label: string; body: unknown; path: string }[] = [
    { label: "15 — doklad pod zákazkou (/orders/{id}/documents)", body, path: `/orders/${encodeURIComponent(String(sync.flowiiOrderId))}/documents` },
    { label: "16 — /documents s väzbami order + orders", body, path: "/documents" },
  ];

  // Poistka: ak odberateľ už má faktúru (napr. 3026034 mimo zákazky), nový
  // pokus sa nepošle — najprv ju treba vo FLOWii skontrolovať alebo vymazať.
  const existing = partnerId
    ? await client.get(`/partners/${encodeURIComponent(String(partnerId))}/documents`, { companyId }).catch(() => null)
    : null;
  const existingInvoices = (existing?.data ?? []).filter((d: any) => d.attributes?.type === 4);
  if (existingInvoices.length) {
    return {
      error: `Odberateľ už má vo FLOWii faktúru ${existingInvoices.map((d: any) => d.attributes?.["serial-nr"]).join(", ")} — nový pokus sa neposlal (aby nevznikla druhá). Ak ju chcete nahradiť, najprv ju vo FLOWii vymažte.`,
    };
  }

  const results: { label: string; status: number | string; response: unknown }[] = [];
  for (const a of attempts) {
    await new Promise((r) => setTimeout(r, 1500));
    const r = await client.tryCreateDocument(companyId, a.body, a.path);
    results.push({ label: a.label, status: r.status, response: r.body });
    if (typeof r.status === "string" && r.status.startsWith("OK")) {
      // Doklad vznikol — ďalej nie. Kontrola súm (bez DPH musí sedieť s webom).
      const expectedNet = r2(web.lines.reduce((sum, l) => sum + l.unitNet * l.quantity, 0));
      await new Promise((res) => setTimeout(res, 1500));
      const docs = await client.get(`/orders/${encodeURIComponent(sync.flowiiOrderId)}/documents`, { companyId }).catch(() => null);
      const createdId = (r.body as any)?.data?.id;
      const doc = (docs?.data ?? []).find((d: any) => String(d.id) === String(createdId));
      const pdocs = partnerId ? await client.get(`/partners/${encodeURIComponent(String(partnerId))}/documents`, { companyId }).catch(() => null) : null;
      const pdoc = (pdocs?.data ?? []).find((d: any) => String(d.id) === String(createdId));
      results.push({
        label: "kontrola súm",
        status: !doc
          ? "FAKTÚRA NIE JE V ZÁKAZKE"
          : Math.abs((doc.attributes?.["order-gross-amount"] ?? -1) - expectedNet) < 0.011
            ? "V ZÁKAZKE, SUMA SEDÍ"
            : "V ZÁKAZKE, SUMA NESEDÍ",
        response: { vytvorena: r.body, ocakavane_bez_DPH: expectedNet, ocakavane_s_DPH: web.paid, doklad: doc?.attributes ?? null, doklad_u_odberatela: pdoc?.attributes ?? null },
      });
      break;
    }
    if (/per\s*day/i.test(JSON.stringify(r.body ?? ""))) break; // denný limit
    // Cesta pod zákazkou existuje, ale niečo jej chýba — nepokračovať na
    // /documents (tam by faktúra opäť vznikla mimo zákazky); najprv opraviť.
    if (a.path !== "/documents" && r.status !== 404 && r.status !== 405) break;
  }
  return { companyId, flowiiOrderId: sync.flowiiOrderId, partnerId, paidOn: web.paidOn, lines: web.lines, results };
}
