import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { sendMail, FROM, ADMIN_INBOX, hasMailCredentials } from "@/lib/mailer";
import { FlowiiClient, FlowiiError, getFlowiiCredentials } from "@/lib/flowii/client";
import { colorSummary, materialLabel, qualityLabel } from "@/lib/print-options";

/**
 * Automatická faktúra vo FLOWii po zaplatení objednávky kartou.
 *
 * Tvar požiadavky zistený skúšobnými pokusmi (faktúra 3026034):
 * POST /documents, attributes kebab-case (type 4, issue-date, maturity…),
 * položky `items` v camelCase (name, quantity, unitPrice, unitPriceType,
 * vatRate). Úhradu netreba — doklad s "Kreditná karta / Stripe" FLOWii
 * berie ako uhradený. Číslo pridelí FLOWii z číselného radu (3026xxx) a
 * zapíše sa do zákazky do poľa „faktura cislo“ (jediná úprava existujúceho
 * záznamu vo FLOWii — so súhlasom majiteľa).
 *
 * POISTKY (nikdy nesmú vzniknúť dve faktúry k jednej objednávke):
 * - záznam v tabuľke FlowiiInvoice sa založí PRED odoslaním (zámok),
 * - zákazka sa pred vytvorením skontroluje, či už faktúru nemá,
 * - pri nejasnom výsledku (výpadok spojenia) sa nič neopakuje — stav
 *   UNKNOWN a e-mail administrátorovi,
 * - suma faktúry sa porovná so zaplatenou sumou; ak nesedí (kupón, iné
 *   DPH…), faktúra sa nevytvorí a príde e-mail na ručné vystavenie.
 * Okrem nového dokladu a poľa „faktura cislo“ vo FLOWii nič nemení.
 */

const VAT = 23;
const PAYMENT_METHOD_CARD = "247565"; // Kreditná karta / Stripe
const BANK_ACCOUNT = "9995";
const CONSTANT_SYMBOL = "0008";
const SYNCABLE = new Set(["PAID", "IN_PRODUCTION", "SHIPPED", "DELIVERED"]);
/** Automatika len pre objednávky od spustenia (staršie majú faktúry ručne). */
const AUTO_FROM = new Date("2026-11-24T14:45:00+01:00");

export function isFlowiiAutoInvoiceEnabled() {
  return getFlowiiCredentials() !== null && process.env.FLOWII_AUTO_INVOICE?.trim().toLowerCase() !== "false";
}

const r2 = (n: number) => Math.round(n * 100) / 100;

// ── Tabuľka stavu ───────────────────────────────────────────────────────────

const ENSURE_SQL = `CREATE TABLE IF NOT EXISTS "FlowiiInvoice" (
  "orderId" TEXT PRIMARY KEY,
  "status" TEXT NOT NULL,
  "documentId" TEXT,
  "serialNr" TEXT,
  "linked" BOOLEAN,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;
let ready: Promise<void> | null = null;
function ensureTable() {
  if (!ready) {
    ready = prisma.$executeRawUnsafe(ENSURE_SQL).then(
      () => undefined,
      (e) => {
        ready = null;
        throw e;
      }
    );
  }
  return ready;
}

export type FlowiiInvoiceRow = {
  orderId: string;
  status: "RUNNING" | "DONE" | "FAILED" | "UNKNOWN" | "SKIPPED";
  documentId: string | null;
  serialNr: string | null;
  linked: boolean | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function getFlowiiInvoice(orderId: string): Promise<FlowiiInvoiceRow | null> {
  await ensureTable();
  const rows = await prisma.$queryRaw<FlowiiInvoiceRow[]>`SELECT * FROM "FlowiiInvoice" WHERE "orderId" = ${orderId}`;
  return rows[0] ?? null;
}

async function setRow(orderId: string, data: Partial<Omit<FlowiiInvoiceRow, "orderId" | "createdAt" | "updatedAt">>) {
  await prisma.$executeRaw`UPDATE "FlowiiInvoice" SET
    "status" = COALESCE(${data.status ?? null}, "status"),
    "documentId" = COALESCE(${data.documentId ?? null}, "documentId"),
    "serialNr" = COALESCE(${data.serialNr ?? null}, "serialNr"),
    "linked" = COALESCE(${data.linked ?? null}, "linked"),
    "error" = ${data.error ?? null},
    "updatedAt" = CURRENT_TIMESTAMP
    WHERE "orderId" = ${orderId}`;
}

/** Zámok: založí záznam RUNNING. Pri ručnom opakovaní prevezme FAILED (príp. UNKNOWN s potvrdením). */
async function claim(orderId: string, opts: { manual?: boolean; confirmUnknown?: boolean }): Promise<boolean> {
  const inserted = await prisma.$executeRaw`INSERT INTO "FlowiiInvoice" ("orderId", "status") VALUES (${orderId}, 'RUNNING') ON CONFLICT ("orderId") DO NOTHING`;
  if (inserted === 1) return true;
  if (!opts.manual) return false;
  const allowed = opts.confirmUnknown ? ["FAILED", "SKIPPED", "UNKNOWN"] : ["FAILED", "SKIPPED"];
  const taken = await prisma.$executeRaw`UPDATE "FlowiiInvoice" SET "status" = 'RUNNING', "error" = NULL, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "orderId" = ${orderId} AND "status" = ANY(${allowed})`;
  return taken === 1;
}

// ── Obsah faktúry ───────────────────────────────────────────────────────────

type Line = { name: string; note: string; quantity: number; unitNet: number; totalNet: number };

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

/** Položky podľa zadania: „3D tlač: súbor“ + riadok „Konfigurácia: …“, doprava; ceny bez DPH. */
export async function buildInvoiceDraft(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { orderItems: { orderBy: { createdAt: "asc" } } } });
  if (!order) return null;
  type Cfg = Record<string, unknown> & { quantity?: unknown; infillPct?: unknown; material?: unknown; quality?: unknown };
  const conf = (c: Cfg) =>
    "Konfigurácia: " +
    [materialLabel(c?.material, ""), qualityLabel(c?.quality, ""), c?.infillPct != null ? `${c.infillPct}% infill` : "", colorSummary(c, "")]
      .filter(Boolean)
      .join(" • ");
  const src =
    order.orderItems.length > 1
      ? order.orderItems.map((oi) => ({ fileName: oi.fileName, config: oi.config as Cfg, pricing: oi.pricing as { total?: unknown } }))
      : [{ fileName: order.fileName, config: order.config as Cfg, pricing: order.pricing as { total?: unknown } }];
  const lines: Line[] = src.map((it) => {
    const qty = Math.max(1, Number(it.config?.quantity ?? 1));
    const net = typeof it.pricing?.total === "number" ? it.pricing.total : 0;
    // Jednotková cena na 4 desatinné miesta, aby súčet riadku sedel s cenou na webe.
    return { name: `3D tlač: ${it.fileName}`, note: conf(it.config ?? {}), quantity: qty, unitNet: Math.round((net / qty) * 1e4) / 1e4, totalNet: net };
  });
  const ship = (order.shippingCost ?? {}) as { amount?: unknown };
  const shipEur = typeof ship.amount === "number" ? ship.amount / 100 : 0;
  if (shipEur > 0) {
    const net = r2(shipEur / (1 + VAT / 100));
    lines.push({ name: order.shippingMethod ?? "Doprava", note: "", quantity: 1, unitNet: net, totalNet: net });
  }
  const productionNet = lines.filter((l) => l.name.startsWith("3D tlač")).reduce((s, l) => s + l.totalNet, 0);
  const expectedNet = r2(lines.reduce((s, l) => s + l.totalNet, 0));
  const expectedGross = r2(productionNet * (1 + VAT / 100) + shipEur);
  return { order, lines, expectedNet, expectedGross, paidOn: await paidDate(order) };
}

// ── Číslo faktúry do zákazky (Detail → „faktura cislo“) ────────────────────

const norm = (v: unknown) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

type Res = { type: string; id: string; attributes?: Record<string, unknown>; relationships?: Record<string, { data?: unknown }> };

/**
 * Zapíše číslo faktúry do vlastného poľa zákazky (so súhlasom majiteľa).
 * Všetky ostatné údaje zákazky sa pošlú nezmenené (aj keby FLOWii pri PATCH
 * prepisovalo celý záznam) a po zápise sa overí, že sa nič iné nezmenilo.
 * Existujúcu inú hodnotu v poli neprepíše. Vráti popis problému alebo null.
 */
async function writeInvoiceNumber(client: FlowiiClient, companyId: string, flowiiOrderId: string, serialNr: string): Promise<string | null> {
  const fieldName = norm(process.env.FLOWII_INVOICE_FIELD_NAME || "faktura cislo");
  const fields = await client.list("/orders/customfields", { companyId });
  const field = fields.find((f) => norm(f.attributes?.name) === fieldName);
  if (!field) return `vlastné pole „${fieldName}“ sa vo FLOWii nenašlo — číslo faktúry doplňte ručne`;

  const read = async () => {
    const json = await client.get(`/orders/${encodeURIComponent(flowiiOrderId)}`, { companyId, include: "custom-field-string-values" });
    const data = json?.data as Res;
    const values = ((json?.included ?? []) as Res[]).filter((r) => r.type === "custom-field-string-value");
    const valueOf = (fieldId: string) =>
      values.find((v) => String((v.relationships?.["custom-field"]?.data as { id?: string } | undefined)?.id) === String(fieldId))?.attributes?.value;
    return { data, values, valueOf };
  };

  const before = await read();
  const current = before.valueOf(field.id);
  if (current && String(current).trim() === serialNr) return null;
  if (current && String(current).trim()) return `pole „faktura cislo“ už obsahuje ${current} — neprepísal som ho, skontrolujte`;

  const a = before.data.attributes ?? {};
  const rel = before.data.relationships ?? {};
  const keep = (k: string) => (rel[k] && "data" in rel[k] ? { [k]: { data: rel[k].data } } : {});
  const body = {
    data: {
      type: "order",
      id: flowiiOrderId,
      attributes: Object.fromEntries(
        ["name", "created", "accepted", "deadline", "finished", "delivered", "warranty", "anticipated-income-amount", "description"]
          .filter((k) => k in a)
          .map((k) => [k, a[k]])
      ),
      relationships: {
        ...keep("type"),
        ...keep("subtype"),
        ...keep("state"),
        ...keep("parent"),
        ...keep("user"),
        ...keep("partner"),
        ...keep("currency"),
        ...keep("business-case"),
        ...keep("responsible-users"),
        "custom-field-string-values": {
          data: [
            ...before.values.map((v) => ({ type: "custom-field-string-value", id: v.id })),
            {
              type: "custom-field-string-value",
              attributes: { value: serialNr },
              relationships: { "custom-field": { data: { type: "custom-field", id: String(field.id) } } },
            },
          ],
        },
      },
    },
  };

  try {
    await client.patchOrderInvoiceNumber(companyId, flowiiOrderId, body);
  } catch (e) {
    const fe = e instanceof FlowiiError ? e : null;
    return `číslo faktúry sa do zákazky nepodarilo zapísať (${fe?.status ?? (e as Error)?.message}${fe?.body ? `: ${String(fe.body).slice(0, 200)}` : ""}) — doplňte ho ručne`;
  }

  // Overenie: nové pole je zapísané a nič iné sa nezmenilo.
  await new Promise((r) => setTimeout(r, 1200));
  const after = await read().catch(() => null);
  if (!after) return "zápis čísla faktúry sa nepodarilo overiť — skontrolujte zákazku";
  const changed: string[] = [];
  if (String(after.valueOf(field.id) ?? "").trim() !== serialNr) changed.push("pole „faktura cislo“ sa nezapísalo");
  for (const v of before.values) {
    const fid = String((v.relationships?.["custom-field"]?.data as { id?: string } | undefined)?.id);
    if (String(after.valueOf(fid) ?? "") !== String(v.attributes?.value ?? "")) changed.push(`zmenilo sa vlastné pole ${fid}`);
  }
  for (const k of ["name", "description", "accepted", "deadline"]) {
    if (k in a && String(after.data.attributes?.[k] ?? "") !== String(a[k] ?? "")) changed.push(`zmenil sa údaj zákazky „${k}“`);
  }
  return changed.length ? `${changed.join(", ")} — skontrolujte zákazku` : null;
}

// ── Vytvorenie ──────────────────────────────────────────────────────────────

export type FlowiiInvoiceResult = { status: FlowiiInvoiceRow["status"] | "IN_PROGRESS" | "ALREADY"; message: string; serialNr?: string | null };

async function notify(subject: string, html: string) {
  if (!hasMailCredentials()) return;
  try {
    await sendMail({ from: FROM, to: ADMIN_INBOX, subject, html: `<div style="font-family:Arial,sans-serif;padding:24px;">${html}</div>` });
  } catch (e) {
    console.error("FLOWii invoice e-mail failed:", e);
  }
}

function esc(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function createFlowiiInvoice(orderId: string, opts: { manual?: boolean; confirmUnknown?: boolean } = {}): Promise<FlowiiInvoiceResult> {
  const creds = getFlowiiCredentials();
  if (!creds) return { status: "SKIPPED", message: "FLOWii nie je nastavené." };
  await ensureTable();

  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true, paymentMethod: true, orderNumber: true, createdAt: true } });
  if (!order) return { status: "SKIPPED", message: "Objednávka neexistuje." };
  if (!SYNCABLE.has(order.status)) return { status: "SKIPPED", message: "Objednávka ešte nie je zaplatená." };
  if (order.paymentMethod !== "CARD") return { status: "SKIPPED", message: "Automatická faktúra je len pre platbu kartou." };
  if (!opts.manual && order.createdAt < AUTO_FROM) return { status: "SKIPPED", message: "Staršia objednávka — faktúra sa automaticky nevystavuje." };

  const sync = await prisma.flowiiSync.findUnique({ where: { orderId } });
  if (!sync?.flowiiOrderId || !sync.flowiiPartnerId) return { status: "SKIPPED", message: "Objednávka ešte nemá zákazku vo FLOWii." };

  if (!(await claim(orderId, opts))) {
    const row = await getFlowiiInvoice(orderId);
    return { status: row?.status === "RUNNING" ? "IN_PROGRESS" : "ALREADY", message: `Faktúra už bola spracovaná (${row?.status}${row?.serialNr ? `, ${row.serialNr}` : ""}).`, serialNr: row?.serialNr };
  }

  const ref = order.orderNumber ?? orderId;
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.vytlacto3d.sk";
  const adminLink = `<p><a href="${base}/admin/orders/${orderId}" style="display:inline-block;background:#FFAE00;color:#000;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:12px;">Otvoriť objednávku →</a></p>`;
  const client = new FlowiiClient(creds);
  const flowiiOrderId = String(sync.flowiiOrderId);
  let sent = false;

  try {
    const companies = await client.list("/companies");
    const companyId = String(process.env.FLOWII_COMPANY_ID?.trim() || companies[0]?.id || "");
    const draft = await buildInvoiceDraft(orderId);
    if (!draft || !draft.lines.length) throw new Error("Objednávka nemá položky.");

    // Suma musí sedieť so zaplatenou — inak (kupón, iné DPH…) radšej ručne.
    const paid = draft.order.paidTotalEur;
    if (typeof paid !== "number" || Math.abs(paid - draft.expectedGross) > 0.02) {
      await setRow(orderId, {
        status: "SKIPPED",
        error: `Suma nesedí: zaplatené ${paid ?? "?"} €, položky ${draft.expectedGross} € s DPH — faktúru vystavte ručne.`,
      });
      await notify(
        `FLOWii: faktúru k ${ref} vystavte ručne`,
        `<h2>Faktúra k ${esc(ref)} sa nevytvorila automaticky</h2><p>Zaplatená suma (${paid ?? "?"} €) nesedí so súčtom položiek (${draft.expectedGross} € s DPH) — napr. zľavový kupón alebo iné DPH. Vystavte ju prosím vo FLOWii ručne.</p>${adminLink}`
      );
      return { status: "SKIPPED", message: "Suma nesedí so zaplatenou — vystavte ručne." };
    }

    // Zákazka už faktúru má (napr. vystavenú ručne) → nič nevytvárať.
    const before = await client.get(`/orders/${encodeURIComponent(flowiiOrderId)}/documents`, { companyId });
    const existing = (before?.data ?? []).find((d: { attributes?: { type?: number } }) => d.attributes?.type === 4);
    if (existing) {
      await setRow(orderId, { status: "DONE", documentId: String(existing.id), serialNr: existing.attributes?.["serial-nr"] ?? null, linked: true, error: "Faktúra už bola v zákazke." });
      return { status: "ALREADY", message: `Zákazka už má faktúru ${existing.attributes?.["serial-nr"] ?? ""}.`, serialNr: existing.attributes?.["serial-nr"] };
    }

    const self = await client.get("/users/self", { companyId });
    const { resolveFlowiiCompanyDataId } = await import("@/lib/flowii/sync");
    const companyDataId = await resolveFlowiiCompanyDataId(client);
    const orderRef = { type: "order", id: flowiiOrderId };
    // Zákazku nesie pravdepodobne každá položka (FLOWii počíta sumy dokladu
    // „za zákazku“ — order-gross-amount); väzba na celý doklad sa ignoruje.
    const buildBody = (linkItems: boolean) => ({
      data: {
        type: "document",
        attributes: {
          type: 4,
          "issue-date": draft.paidOn,
          "delivery-date": draft.paidOn,
          maturity: draft.paidOn,
          "constant-symbol": CONSTANT_SYMBOL,
          "order-number": draft.order.orderNumber ?? "",
          items: draft.lines.map((l) => ({
            name: l.name,
            ...(l.note ? { note: l.note, description: l.note } : {}),
            quantity: l.quantity,
            unitPrice: l.unitNet,
            unitPriceType: 1,
            vatRate: VAT,
            ...(linkItems ? { orderId: Number(flowiiOrderId), order: { id: Number(flowiiOrderId) } } : {}),
          })),
        },
        relationships: {
          order: { data: orderRef },
          orders: { data: [orderRef] },
          partner: { data: { type: "partner", id: String(sync.flowiiPartnerId) } },
          user: { data: { type: "user", id: String(self?.data?.id ?? "") } },
          "company-data": { data: { type: "company-data", id: String(companyDataId) } },
          currency: { data: { type: "currency", id: "44" } },
          "payment-method": { data: { type: "payment-method", id: PAYMENT_METHOD_CARD } },
          "bank-account": { data: { type: "bank-account", id: BANK_ACCOUNT } },
        },
      },
    });

    // Pokusy od najlepšieho; ďalší len keď FLOWii predošlý odmietne (4xx =
    // doklad nevznikol). Posledný je overený tvar (3026034, 3026035) — faktúra
    // má prednosť, priradenie k zákazke sa potom skontroluje.
    const attempts = [
      { label: "pod zákazkou, položky so zákazkou", path: `/orders/${encodeURIComponent(flowiiOrderId)}/documents`, body: buildBody(true) },
      { label: "/documents, položky so zákazkou", path: "/documents", body: buildBody(true) },
      { label: "/documents (overený tvar)", path: "/documents", body: buildBody(false) },
    ];
    const tried: string[] = [];
    sent = true;
    let r: { status: number | string; body: unknown } = { status: "?", body: null };
    for (const at of attempts) {
      r = await client.tryCreateDocument(companyId, at.body, at.path);
      tried.push(`${at.label}: ${r.status}${typeof r.status === "number" ? ` ${JSON.stringify(r.body).slice(0, 160)}` : ""}`);
      const rejected = typeof r.status === "number" && r.status >= 400 && r.status < 500 && ![401, 403, 429].includes(r.status);
      if (!rejected) break;
      await new Promise((res) => setTimeout(res, 1200));
    }
    console.log("FLOWii invoice attempts:", ref, JSON.stringify(tried));
    if (!(typeof r.status === "string" && r.status.startsWith("OK"))) {
      // FLOWii požiadavku odmietol — doklad nevznikol.
      throw new FlowiiError(`FLOWii faktúru odmietol (${r.status}).`, typeof r.status === "number" ? r.status : undefined, JSON.stringify(r.body).slice(0, 1000));
    }
    const created = (r.body as { data?: { id?: string; attributes?: { "serial-nr"?: string } } })?.data;
    const documentId = String(created?.id ?? "");
    const serialNr = created?.attributes?.["serial-nr"] ?? null;

    // Kontrola: je faktúra v zákazke a sedí suma?
    await new Promise((res) => setTimeout(res, 1500));
    const after = await client.get(`/orders/${encodeURIComponent(flowiiOrderId)}/documents`, { companyId }).catch(() => null);
    const doc = (after?.data ?? []).find((d: { id?: string }) => String(d.id) === documentId);
    const linked = Boolean(doc);
    const netOk = !doc || Math.abs(Number(doc.attributes?.["order-gross-amount"] ?? draft.expectedNet) - draft.expectedNet) < 0.011;
    // Číslo faktúry do zákazky (Detail → faktura cislo) — so súhlasom majiteľa.
    const fieldProblem = serialNr
      ? await writeInvoiceNumber(client, companyId, flowiiOrderId, String(serialNr)).catch((e) => `zápis čísla faktúry zlyhal (${(e as Error)?.message}) — doplňte ho ručne`)
      : "FLOWii nevrátilo číslo faktúry — doplňte ho do zákazky ručne";
    const problems = [!linked && `nie je priradená k zákazke (pokusy: ${tried.join(" | ").slice(0, 600)})`, !netOk && `suma bez DPH vo FLOWii nesedí (čakalo sa ${draft.expectedNet} €)`, fieldProblem].filter(Boolean);
    await setRow(orderId, { status: "DONE", documentId, serialNr, linked, error: problems.length ? `Skontrolujte: ${problems.join(", ")}.` : null });
    if (problems.length) {
      await notify(
        `FLOWii: faktúru ${serialNr ?? ""} k ${ref} skontrolujte`,
        `<h2>Faktúra ${esc(String(serialNr ?? ""))} k ${esc(ref)} vznikla, ale treba ju skontrolovať</h2><p>${esc(problems.join(", "))}. Opravte ju prosím vo FLOWii ručne (napr. priraďte k zákazke).</p>${adminLink}`
      );
    }
    console.log("FLOWii invoice:", ref, serialNr, linked ? "linked" : "NOT linked");
    return { status: "DONE", message: `Faktúra ${serialNr ?? ""} vytvorená${problems.length ? ` — ${problems.join(", ")}` : ""}.`, serialNr };
  } catch (e) {
    const fe = e instanceof FlowiiError ? e : null;
    const message = `${(e as Error)?.message ?? String(e)}${fe?.body ? ` — ${fe.body}` : ""}`.slice(0, 1500);
    // Odmietnutie (4xx) alebo chyba pred odoslaním = doklad určite nevznikol.
    // Inak (výpadok spojenia počas odosielania) nevieme — nič sa neopakuje.
    const definite = !sent || (fe?.status !== undefined && fe.status >= 400 && fe.status < 500);
    if (definite && fe?.status === 429) {
      // Limit požiadaviek — nevzniklo nič, zámok sa uvoľní a skúsi sa znova (ráno cron).
      await prisma.$executeRaw`DELETE FROM "FlowiiInvoice" WHERE "orderId" = ${orderId} AND "status" = 'RUNNING'`;
      throw e;
    }
    const status = definite ? "FAILED" : "UNKNOWN";
    await setRow(orderId, { status, error: message });
    await notify(
      status === "FAILED" ? `⚠ FLOWii: faktúra k ${ref} sa nevytvorila` : `⚠ FLOWii: faktúra k ${ref} — skontrolujte, či vznikla`,
      `<h2>${status === "FAILED" ? `Faktúra k ${esc(ref)} sa nevytvorila` : `Pri vytváraní faktúry k ${esc(ref)} vypadlo spojenie`}</h2><p>${
        status === "FAILED"
          ? "FLOWii ju odmietol, nič nevzniklo. V administrácii ju môžete vystaviť znova tlačidlom, alebo ju vystavte vo FLOWii ručne."
          : "Nevieme, či faktúra vo FLOWii vznikla — automaticky sa to neopakuje, aby nevznikla dvakrát. Skontrolujte prosím FLOWii."
      }</p><pre style="white-space:pre-wrap;background:#f6f6f6;border-radius:12px;padding:12px;font-size:13px;">${esc(message)}</pre>${adminLink}`
    );
    return { status, message };
  }
}

/** Ráno (cron): faktúry k novým zaplateným objednávkam, ktoré ešte žiadnu nemajú (napr. po dennom limite FLOWii). */
export async function createMissingFlowiiInvoices(limit = 15) {
  const details: string[] = [];
  if (!isFlowiiAutoInvoiceEnabled()) return ["Automatické faktúry sú vypnuté."];
  await ensureTable();
  const rows = await prisma.$queryRaw<{ orderId: string }[]>`
    SELECT s."orderId" FROM "FlowiiSync" s
    JOIN "Order" o ON o."id" = s."orderId"
    LEFT JOIN "FlowiiInvoice" i ON i."orderId" = s."orderId"
    WHERE s."status" = 'DONE' AND i."orderId" IS NULL AND o."paymentMethod" = 'CARD' AND o."createdAt" >= ${AUTO_FROM}
    ORDER BY o."createdAt" ASC LIMIT ${limit}`;
  for (const r of rows) {
    try {
      const res = await createFlowiiInvoice(r.orderId);
      details.push(`${r.orderId}: ${res.status} ${res.message}`);
    } catch (e) {
      details.push(`${r.orderId}: ${String((e as Error)?.message ?? e).slice(0, 200)}`);
      if (e instanceof FlowiiError && /per\s*day/i.test(String(e.body ?? ""))) break;
    }
  }
  return details;
}
