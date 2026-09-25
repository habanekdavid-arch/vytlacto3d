import { after } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendMail, FROM, ADMIN_INBOX, hasMailCredentials } from "@/lib/mailer";
import {
  FlowiiClient,
  FlowiiError,
  clearFlowiiTokenCache,
  getFlowiiCredentials,
  type JsonApiResource,
} from "@/lib/flowii/client";
import type { OrderWithItems } from "@/lib/order-copy-text";
import {
  buildFlowiiZakazka,
  getFlowiiSettings,
  type FlowiiPartnerDraft,
  type FlowiiSettings,
  type FlowiiZakazkaDraft,
} from "@/lib/flowii/zakazka";

/**
 * Prenos zaplatenej objednávky do FLOWii: partner (len ak neexistuje) →
 * zákazka → úloha. Každý krok sa po úspechu hneď zapíše do FlowiiSync, takže
 * opakovaný pokus pokračuje tam, kde skončil, a nič sa nevytvorí dvakrát.
 */

const SYNCABLE_STATUSES = new Set(["PAID", "IN_PRODUCTION", "SHIPPED", "DELIVERED"]);
// Stav FLOWii úlohy (činnosti) "Čaká" — pevný číselník z dokumentácie API.
const ACTIVITY_STATE_WAITING = 4;
const STALE_RUNNING_MS = 10 * 60_000;

// Rovnaké ako prisma/migrations/20260924000000_add_flowii_sync — tabuľka tak
// vznikne aj bez ručného spustenia migrácie.
const ENSURE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS "FlowiiSync" (
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "flowiiPartnerId" TEXT,
    "flowiiOrderId" TEXT,
    "flowiiTaskId" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FlowiiSync_pkey" PRIMARY KEY ("orderId")
)`;

let tableReady: Promise<void> | null = null;

function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = prisma.$executeRawUnsafe(ENSURE_TABLE_SQL).then(
      () => undefined,
      (e) => {
        tableReady = null;
        throw e;
      }
    );
  }
  return tableReady;
}

export function isFlowiiConfigured() {
  return getFlowiiCredentials() !== null;
}

/** Automatika beží, hneď ako sú nastavené prístupy. FLOWII_ENABLED=false ju vypne. */
export function isFlowiiAutoEnabled() {
  return isFlowiiConfigured() && process.env.FLOWII_ENABLED?.trim().toLowerCase() !== "false";
}

/** Spustí prenos po odoslaní odpovede, aby nezdržal Stripe webhook ani administráciu. */
export function scheduleFlowiiSync(orderId: string) {
  if (!isFlowiiAutoEnabled()) return;
  try {
    after(async () => {
      try {
        const result = await syncOrderToFlowii(orderId);
        console.log("FLOWii sync:", orderId, result.status);
      } catch (e) {
        console.error("FLOWii sync failed:", orderId, e);
        await notifyFailure(orderId, e);
      }
    });
  } catch (e) {
    console.error("FLOWii sync could not be scheduled:", orderId, e);
  }
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Automatický prenos beží na pozadí — pri chybe o tom musí niekto vedieť. */
async function notifyFailure(orderId: string, error: unknown) {
  if (!hasMailCredentials()) return;
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { orderNumber: true } });
    const ref = order?.orderNumber ?? orderId;
    const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.vytlacto3d.sk";
    const message = error instanceof FlowiiError && error.body ? `${error.message} — ${error.body}` : String((error as any)?.message ?? error);
    await sendMail({
      from: FROM,
      to: ADMIN_INBOX,
      subject: `⚠ FLOWii: zákazka pre ${ref} sa nevytvorila`,
      html: `
        <div style="font-family:Arial,sans-serif;padding:24px;">
          <h2 style="margin:0 0 12px;">Prenos objednávky ${escapeHtml(ref)} do FLOWii zlyhal</h2>
          <p style="margin:0 0 12px;color:#444;">Nič, čo už vo FLOWii bolo, sa nezmenilo. Čo sa stihlo vytvoriť, je uvedené pri objednávke — opakovaný pokus pokračuje odtiaľ.</p>
          <pre style="white-space:pre-wrap;background:#f6f6f6;border-radius:12px;padding:12px;font-size:13px;">${escapeHtml(message.slice(0, 2000))}</pre>
          <p><a href="${base}/admin/orders/${orderId}" style="display:inline-block;background:#FFAE00;color:#000;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:12px;">Otvoriť objednávku a skúsiť znova →</a></p>
        </div>`,
    });
  } catch (mailErr) {
    console.error("FLOWii failure e-mail could not be sent:", mailErr);
  }
}

export type FlowiiSyncRow = {
  orderId: string;
  status: string;
  attempts: number;
  flowiiPartnerId: string | null;
  flowiiOrderId: string | null;
  flowiiTaskId: string | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Pre administráciu — nikdy nevyhodí chybu, aby nerozbila stránku objednávky. */
export async function getFlowiiSyncStatus(orderId: string): Promise<FlowiiSyncRow | null> {
  // Kým FLOWii nie je nastavené, na databázu sa vôbec nesiahne.
  if (!isFlowiiConfigured()) return null;
  try {
    await ensureTable();
    return await prisma.flowiiSync.findUnique({ where: { orderId } });
  } catch (e) {
    console.error("FLOWii sync status unavailable:", e);
    return null;
  }
}

// ── Vyhľadávanie v číselníkoch (len čítanie) ────────────────────────────────

function norm(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// FLOWii vypisuje používateľov ako "Priezvisko Meno" — poradie slov neriešime.
function personKey(value: unknown): string {
  return norm(value).split(" ").sort().join(" ");
}

function pickOne(
  items: JsonApiResource[],
  wanted: string,
  what: string,
  key: (v: unknown) => string = norm
): JsonApiResource {
  const target = key(wanted);
  const matches = items.filter((i) => key(i.attributes?.name) === target);
  if (matches.length === 1) return matches[0];
  const available = items.map((i) => i.attributes?.name).filter(Boolean).join(", ") || "—";
  throw new FlowiiError(
    matches.length === 0
      ? `${what} "${wanted}" sa vo FLOWii nenašiel. Dostupné: ${available}`
      : `${what} "${wanted}" nie je jednoznačný (${matches.length} zhody).`
  );
}

type Refs = {
  companyId: string;
  selfUserId: string;
  orderTypeId: string;
  orderStateId: string;
  responsibleUserIds: string[];
  // Pole "Firma" zákazky — fakturačné údaje "4from media, s.r.o. (vytlacto3D.sk)".
  companyDataId: string;
  // Vlastné pole "objednavka" (Detail) — null, ak sa vo FLOWii nenašlo.
  orderNumberFieldId: string | null;
  countries: JsonApiResource[];
  users: JsonApiResource[];
};

type TaskRefs = {
  assigneeUserIds: string[];
  activityTypeId: string;
};

/**
 * Číselníky z FLOWii (firmy, používatelia, typy, stavy, krajiny, typy činností).
 * Čítajú sa postupne a pamätajú sa 10 minút, aby sme FLOWii nezahltili —
 * pri veľa požiadavkách naraz vracia HTTP 429.
 */
type RefData = {
  companies: JsonApiResource[];
  companyId: string;
  selfUserId: string;
  users: JsonApiResource[];
  orderTypes: JsonApiResource[];
  orderStates: JsonApiResource[];
  countries: JsonApiResource[];
  activityTypes: JsonApiResource[];
  companyData: JsonApiResource[];
  orderCustomFields: JsonApiResource[];
};

const REF_CACHE_MS = 10 * 60_000;
let refCache: { key: string; at: number; data: RefData } | null = null;

/** Zabudne číselníky aj prihlásenie — "Test FLOWii" tak vždy overí aktuálny stav. */
export function clearFlowiiCache() {
  refCache = null;
  clearFlowiiTokenCache();
}

function refCacheKey(creds: { baseUrl: string; apiKey: string; username: string }) {
  return `${creds.baseUrl}|${creds.apiKey}|${creds.username}`;
}

function pickCompanyId(companies: JsonApiResource[]): string {
  const fromEnv = process.env.FLOWII_COMPANY_ID?.trim();
  if (fromEnv) {
    if (!companies.some((c) => String(c.id) === fromEnv)) {
      throw new FlowiiError(`FLOWII_COMPANY_ID=${fromEnv} nie je medzi firmami, ku ktorým má API používateľ prístup.`);
    }
    return fromEnv;
  }
  if (companies.length === 1) return String(companies[0].id);

  // Viac firiem: vyberieme tú, ktorej názov sedí s "4from media, s.r.o. (vytlacto3D.sk)".
  const wanted = norm(getFlowiiSettings().companyName);
  const byName = companies.filter((c) => {
    const name = norm(c.attributes?.name);
    return Boolean(name) && (wanted.includes(name) || name.includes(wanted));
  });
  if (byName.length === 1) return String(byName[0].id);

  throw new FlowiiError(
    `API používateľ má prístup k ${companies.length} firmám — nastavte FLOWII_COMPANY_ID (${companies
      .map((c) => `${c.id} = ${c.attributes?.name}`)
      .join(", ")}).`
  );
}

async function loadRefData(client: FlowiiClient, cacheKey: string): Promise<RefData> {
  const key = `${cacheKey}|${process.env.FLOWII_COMPANY_ID ?? ""}`;
  if (refCache && refCache.key === key && Date.now() - refCache.at < REF_CACHE_MS) return refCache.data;

  const companies = await client.list("/companies");
  const companyId = pickCompanyId(companies);
  const q = { companyId };
  const self = await client.get("/users/self", q);
  const selfUserId = self?.data?.id;
  if (!selfUserId) throw new FlowiiError("FLOWii nevrátilo ID API používateľa (/users/self).");

  const data: RefData = {
    companies,
    companyId,
    selfUserId: String(selfUserId),
    users: await client.list("/users", q),
    orderTypes: await client.list("/ordertypes", q),
    orderStates: await client.list("/orderstates", q),
    countries: await client.list("/countries", q),
    activityTypes: await client.list("/activitytypes", q),
    companyData: await client.list("/companydata", q),
    orderCustomFields: await client.list("/orders/customfields", q),
  };
  refCache = { key, at: Date.now(), data };
  return data;
}

// value-type 3 = text (podľa príkladov v dokumentácii FLOWii)
function findOrderNumberField(ref: RefData, settings: FlowiiSettings): JsonApiResource | null {
  const wanted = norm(settings.orderNumberFieldName);
  const matches = ref.orderCustomFields.filter(
    (f) => norm(f.attributes?.name) === wanted && [undefined, null, 3].includes(f.attributes?.["value-type"])
  );
  return matches.length === 1 ? matches[0] : null;
}

function resolveRefs(ref: RefData, settings: FlowiiSettings): Refs {
  // Typ zákazky je hlavný typ, nie podtyp.
  const topLevelTypes = ref.orderTypes.filter((t) => !t.relationships?.parent?.data);
  return {
    companyId: ref.companyId,
    selfUserId: ref.selfUserId,
    orderTypeId: pickOne(topLevelTypes.length ? topLevelTypes : ref.orderTypes, settings.contractTypeName, "Typ zákazky").id,
    orderStateId: pickOne(ref.orderStates, settings.contractStateName, "Stav zákazky").id,
    responsibleUserIds: [pickOne(ref.users, settings.responsibleName, "Používateľ", personKey).id],
    companyDataId: pickOne(ref.companyData, settings.companyName, "Firma (fakturačné údaje)").id,
    orderNumberFieldId: findOrderNumberField(ref, settings)?.id ?? null,
    countries: ref.countries,
    users: ref.users,
  };
}

/**
 * Typ činnosti je pri úlohe povinný. Bez nastavenia: "Realizácia", ak ju
 * FLOWii má, inak prvý typ v poradí FLOWii — ovplyvní len zaradenie úlohy.
 */
function pickActivityType(activityTypes: JsonApiResource[], wanted: string | null): JsonApiResource {
  if (wanted) return pickOne(activityTypes, wanted, "Typ činnosti");
  if (activityTypes.length === 0) throw new FlowiiError("Vo FLOWii nie je žiadny typ činnosti — úlohu nie je možné vytvoriť.");
  return activityTypes.find((a) => norm(a.attributes?.name) === "realizacia") ?? activityTypes[0];
}

function resolveTaskRefs(ref: RefData, settings: FlowiiSettings): TaskRefs {
  return {
    assigneeUserIds: settings.taskAssigneeNames.map((n) => pickOne(ref.users, n, "Používateľ", personKey).id),
    activityTypeId: pickActivityType(ref.activityTypes, settings.activityTypeName).id,
  };
}

// ── Partner ────────────────────────────────────────────────────────────────

function partnerDisplayName(p: FlowiiPartnerDraft): string {
  if (p.kind === "COMPANY" && p.name) return p.name;
  return [p.firstName, p.lastName].filter(Boolean).join(" ") || p.email || "Zákazník vytlacto3D";
}

function normIco(value: unknown) {
  return String(value ?? "").replace(/\s+/g, "");
}

/**
 * Existujúceho partnera prevezmeme len pri istej zhode: rovnaký e-mail
 * kontaktu, pri firme aj rovnaké IČO. FLOWii ponúka iba fulltextové
 * vyhľadávanie, preto každého kandidáta overíme v jeho detaile.
 */
async function findExistingPartner(client: FlowiiClient, companyId: string, p: FlowiiPartnerDraft): Promise<string | null> {
  const terms = [p.email, p.kind === "COMPANY" ? p.ico : null, partnerDisplayName(p)]
    .filter((t): t is string => Boolean(t && t.trim()));
  const candidateIds: string[] = [];
  for (const term of [...new Set(terms)]) {
    const json = await client.get("/partners", { companyId, "filter[search-text]": term });
    for (const item of (Array.isArray(json?.data) ? json.data : []).slice(0, 10)) {
      if (!candidateIds.includes(String(item.id))) candidateIds.push(String(item.id));
    }
  }

  const wantedEmail = norm(p.email);
  const wantedIco = p.kind === "COMPANY" ? normIco(p.ico) : "";

  for (const id of candidateIds.slice(0, 15)) {
    const detail = await client.get(`/partners/${encodeURIComponent(id)}`, { companyId });
    const attrs = detail?.data?.attributes ?? {};

    if (wantedIco && normIco(attrs.ico) === wantedIco) return id;

    if (wantedEmail) {
      let contacts: JsonApiResource[] = (Array.isArray(detail?.included) ? detail.included : []).filter(
        (i: JsonApiResource) => i.type === "contact"
      );
      if (contacts.length === 0) {
        const list = await client.get(`/partners/${encodeURIComponent(id)}/contacts`, { companyId });
        contacts = Array.isArray(list?.data) ? list.data : [];
      }
      if (contacts.some((c) => norm(c.attributes?.email) === wantedEmail)) return id;
    }
  }
  return null;
}

function orUndefined<T>(v: T | null | undefined): T | undefined {
  return v === null || v === undefined || v === "" ? undefined : v;
}

function buildPartnerBody(p: FlowiiPartnerDraft, refs: Refs) {
  const country = p.billingAddress.countryName
    ? refs.countries.find((c) => norm(c.attributes?.name) === norm(p.billingAddress.countryName))
    : undefined;

  return {
    data: {
      type: "partner",
      attributes: {
        name: partnerDisplayName(p),
        type: p.kind === "COMPANY" ? 1 : 2,
        comment: orUndefined(p.note),
        ico: orUndefined(p.ico),
        dic: orUndefined(p.dic),
        "ic-dph": orUndefined(p.icDph),
      },
      relationships: {
        "billing-address": {
          data: {
            type: "address",
            attributes: {
              street: orUndefined(p.billingAddress.street),
              city: orUndefined(p.billingAddress.city),
              zip: orUndefined(p.billingAddress.zip),
            },
            ...(country ? { relationships: { country: { data: { type: "country", id: country.id } } } } : {}),
          },
        },
        "responsible-user": { data: { type: "user", id: refs.responsibleUserIds[0] } },
        "key-contact": {
          data: {
            type: "contact",
            attributes: {
              "first-name": orUndefined(p.firstName),
              "last-name": orUndefined(p.lastName),
              email: orUndefined(p.email),
              phone: orUndefined(p.phone),
            },
          },
        },
      },
    },
  };
}

// ── Zákazka a úloha ────────────────────────────────────────────────────────

function flowiiDate(isoDate: string) {
  return `${isoDate}T00:00:00`;
}

function flowiiDateTime(d: Date) {
  // FLOWii používa dátumy bez časovej zóny — posielame miestny čas.
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Bratislava",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(d);
  return parts.replace(" ", "T");
}

function buildOrderBody(
  draft: FlowiiZakazkaDraft,
  refs: Refs,
  partnerId: string,
  createdAt: Date,
  withOptional = true
) {
  const orderNumberField =
    withOptional && refs.orderNumberFieldId && draft.orderNumber
      ? {
          "custom-field-string-values": {
            data: [
              {
                type: "custom-field-string-value",
                attributes: { value: draft.orderNumber },
                relationships: { "custom-field": { data: { type: "custom-field", id: refs.orderNumberFieldId } } },
              },
            ],
          },
        }
      : {};
  return {
    data: {
      type: "order",
      attributes: {
        name: draft.name,
        created: flowiiDateTime(createdAt),
        accepted: flowiiDate(draft.receivedDate),
        deadline: flowiiDate(draft.deadlineDate),
        description: draft.description,
      },
      relationships: {
        type: { data: { type: "order-type", id: refs.orderTypeId } },
        state: { data: { type: "order-state", id: refs.orderStateId } },
        partner: { data: { type: "partner", id: partnerId } },
        user: { data: { type: "user", id: refs.selfUserId } },
        "responsible-users": { data: refs.responsibleUserIds.map((id) => ({ type: "user", id })) },
        ...(withOptional ? { "company-data": { data: { type: "company-data", id: refs.companyDataId } } } : {}),
        ...orderNumberField,
      },
    },
  };
}

// Firma (company-data) ani vlastné polia pri zákazke nie sú v dokumentácii
// FLOWii opísané úplne. Keby ich FLOWii odmietlo (400/422 = záznam
// nevznikol), zákazka sa založí bez nich a upozorní sa na to.
function isRejected(e: unknown) {
  return e instanceof FlowiiError && (e.status === 400 || e.status === 422);
}

const OPTIONAL_REJECTED_NOTE =
  "FLOWii odmietlo pole Firma / Detail → objednávka — zákazka vznikla bez nich, doplňte ich ručne.";

function orderNotes(refs: Refs, draft: FlowiiZakazkaDraft, optionalApplied: boolean, settings: FlowiiSettings): string | null {
  const notes: string[] = [];
  if (!optionalApplied) notes.push(OPTIONAL_REJECTED_NOTE);
  else if (!refs.orderNumberFieldId && draft.orderNumber) {
    notes.push(`Vlastné pole "${settings.orderNumberFieldName}" (Detail) sa vo FLOWii nenašlo — číslo objednávky treba doplniť ručne.`);
  }
  return notes.length ? notes.join(" ") : null;
}

async function createOrder(
  client: FlowiiClient,
  draft: FlowiiZakazkaDraft,
  refs: Refs,
  partnerId: string,
  createdAt: Date
): Promise<{ id: string; optionalApplied: boolean }> {
  try {
    return { id: await client.create("/orders", refs.companyId, buildOrderBody(draft, refs, partnerId, createdAt)), optionalApplied: true };
  } catch (e) {
    if (!isRejected(e)) throw e;
    const id = await client.create("/orders", refs.companyId, buildOrderBody(draft, refs, partnerId, createdAt, false));
    return { id, optionalApplied: false };
  }
}

/** Číslo zákazky, ktoré pridelilo FLOWii (len čítanie) — na názov úlohy. */
async function readOrderSerial(client: FlowiiClient, refs: Refs, orderId: string): Promise<string | null> {
  const detail = await client.get(`/orders/${encodeURIComponent(orderId)}`, { companyId: refs.companyId });
  return String(detail?.data?.attributes?.["serial-nr"] ?? "").trim() || null;
}

function numberedTaskDraft(draft: FlowiiZakazkaDraft, serial: string | null): FlowiiZakazkaDraft {
  return { ...draft, task: { ...draft.task, title: serial ? `${serial}_${draft.baseName}` : draft.task.title } };
}

function buildTaskBody(draft: FlowiiZakazkaDraft, refs: TaskRefs, partnerId: string, flowiiOrderId: string) {
  const deadline = flowiiDate(draft.task.dueDate);
  return {
    data: {
      type: "task",
      attributes: {
        caption: draft.task.title,
        description: draft.task.description,
        deadline,
      },
      relationships: {
        activities: {
          data: refs.assigneeUserIds.map((userId) => ({
            type: "activity",
            attributes: { state: ACTIVITY_STATE_WAITING, deadline },
            relationships: {
              "activity-type": { data: { type: "activity-type", id: refs.activityTypeId } },
              user: { data: { type: "user", id: userId } },
            },
          })),
        },
        order: { data: { type: "order", id: flowiiOrderId } },
        partner: { data: { type: "partner", id: partnerId } },
      },
    },
  };
}

// ── Hlavný tok ─────────────────────────────────────────────────────────────

export type FlowiiSyncResult =
  | { status: "DONE"; row: FlowiiSyncRow }
  | { status: "ALREADY_DONE"; row: FlowiiSyncRow }
  | { status: "IN_PROGRESS" }
  | { status: "SKIPPED"; reason: string };

async function claim(orderId: string, allowStaleReclaim: boolean): Promise<FlowiiSyncRow | FlowiiSyncResult> {
  try {
    return await prisma.flowiiSync.create({ data: { orderId, status: "RUNNING", attempts: 1 } });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
  }

  const existing = await prisma.flowiiSync.findUnique({ where: { orderId } });
  if (!existing) return { status: "IN_PROGRESS" };
  if (existing.status === "DONE") return { status: "ALREADY_DONE", row: existing };

  const canTake =
    existing.status === "FAILED" ||
    (existing.status === "RUNNING" && allowStaleReclaim && Date.now() - existing.updatedAt.getTime() > STALE_RUNNING_MS);
  if (!canTake) return { status: "IN_PROGRESS" };

  // Podmienený update = atomický zámok; súbežný pokus dostane count 0.
  const taken = await prisma.flowiiSync.updateMany({
    where: { orderId, status: existing.status, updatedAt: existing.updatedAt },
    data: { status: "RUNNING", attempts: { increment: 1 } },
  });
  if (taken.count !== 1) return { status: "IN_PROGRESS" };
  return (await prisma.flowiiSync.findUnique({ where: { orderId } }))!;
}

export async function syncOrderToFlowii(
  orderId: string,
  opts: { manual?: boolean } = {}
): Promise<FlowiiSyncResult> {
  const creds = getFlowiiCredentials();
  if (!creds) return { status: "SKIPPED", reason: "FLOWii nie je nastavené (chýbajú premenné FLOWII_*)." };

  await ensureTable();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { orderItems: { orderBy: { createdAt: "asc" } }, user: { select: { name: true } } },
  });
  if (!order) return { status: "SKIPPED", reason: "Objednávka neexistuje." };
  if (!SYNCABLE_STATUSES.has(order.status)) {
    return { status: "SKIPPED", reason: `Objednávka je v stave ${order.status} — zákazka vzniká až po zaplatení.` };
  }

  const claimed = await claim(orderId, Boolean(opts.manual));
  if (!("orderId" in claimed)) return claimed;
  let row = claimed;

  const client = new FlowiiClient(creds);
  const settings = getFlowiiSettings();

  try {
    const ref = await loadRefData(client, refCacheKey(creds));
    const refs = resolveRefs(ref, settings);
    // Dátum prvého pokusu — pri opakovaní sa "prijatá" neposúva.
    const draft = buildFlowiiZakazka(order, { accountName: order.user?.name, now: row.createdAt, settings });

    let partnerId = row.flowiiPartnerId;
    if (!partnerId) {
      partnerId =
        (await findExistingPartner(client, refs.companyId, draft.partner)) ??
        (await client.create("/partners", refs.companyId, buildPartnerBody(draft.partner, refs)));
      row = await prisma.flowiiSync.update({ where: { orderId }, data: { flowiiPartnerId: partnerId } });
    }

    let flowiiOrderId = row.flowiiOrderId;
    let note: string | null = null;
    if (!flowiiOrderId) {
      const created = await createOrder(client, draft, refs, partnerId, row.createdAt);
      flowiiOrderId = created.id;
      note = orderNotes(refs, draft, created.optionalApplied, settings);
      row = await prisma.flowiiSync.update({ where: { orderId }, data: { flowiiOrderId } });
    }

    if (!row.flowiiTaskId) {
      const serial = await readOrderSerial(client, refs, flowiiOrderId);
      // Až tu — chýbajúci riešiteľ nesmie zablokovať samotnú zákazku.
      const taskRefs = resolveTaskRefs(ref, settings);
      const taskId = await client.create(
        "/tasks",
        refs.companyId,
        buildTaskBody(numberedTaskDraft(draft, serial), taskRefs, partnerId, flowiiOrderId)
      );
      row = await prisma.flowiiSync.update({ where: { orderId }, data: { flowiiTaskId: taskId } });
    }

    row = await prisma.flowiiSync.update({ where: { orderId }, data: { status: "DONE", lastError: note } });
    return { status: "DONE", row };
  } catch (e: any) {
    const detail = e instanceof FlowiiError && e.body ? ` — ${e.body}` : "";
    const message = `${e?.message ?? String(e)}${detail}`.slice(0, 2000);
    await prisma.flowiiSync
      .update({ where: { orderId }, data: { status: "FAILED", lastError: message } })
      .catch((dbErr) => console.error("FLOWii sync: could not record failure", dbErr));
    throw e;
  }
}

// ── Testovacia zákazka ─────────────────────────────────────────────────────

export type FlowiiTestResult = {
  partnerId: string;
  partnerReused: boolean;
  orderId: string;
  taskId: string;
  name: string;
  taskName: string;
  orderNumber: string | null;
  note: string | null;
};

/**
 * Založí vo FLOWii jednu fiktívnu zákazku rovnakou cestou ako skutočná
 * objednávka — na overenie, ako vyzerá. Na webe nič nevzniká (žiadna
 * objednávka, žiadna platba). Súbor sa volá "TEST_zmazat_model.stl" a popis
 * aj úloha nesú upozornenie, že ide o test.
 * Najprv sa overia všetky číselníky; ak niečo nesedí, nevznikne nič.
 */
export async function createFlowiiTestZakazka(): Promise<FlowiiTestResult> {
  const creds = getFlowiiCredentials();
  if (!creds) throw new FlowiiError("FLOWii nie je nastavené (chýbajú premenné FLOWII_*).");

  const client = new FlowiiClient(creds);
  const settings = getFlowiiSettings();
  const ref = await loadRefData(client, refCacheKey(creds));
  const refs = resolveRefs(ref, settings);
  const taskRefs = resolveTaskRefs(ref, settings);

  const now = new Date();
  const stamp = flowiiDateTime(now).slice(0, 16).replace("T", " ");
  const itemConfig = { material: "PLA", quality: "STANDARD", color: "black", quantity: 1, infillPct: 20, scalePct: 100 };
  const testFile = "TEST_zmazat_model.stl";
  const fakeOrder = {
    id: "test",
    orderNumber: `TEST ${stamp}`,
    status: "PAID",
    createdAt: now,
    fileName: testFile,
    fileKey: "test",
    analysis: { dimsXmm: 40, dimsYmm: 30, dimsZmm: 20, volumeCm3: 12.5 },
    config: { ...itemConfig, allowModelAdjustments: true },
    pricing: { total: 10 },
    paidTotalEur: 17.22,
    shippingCost: { amount: 492, currency: "eur" },
    shippingMethod: "Packeta výdajňa / Z-Box",
    customerEmail: "test-klient@vytlacto3d.sk",
    phone: null,
    accountType: "PERSON",
    companyName: null,
    ico: null,
    dic: null,
    icDph: null,
    contactPerson: null,
    billingAddress: { name: "Ján Testovací", street: "Nezábudková 5", city: "Bratislava", zip: "82101", country: "SK" },
    deliveryAddress: { type: "packeta", packetaPointName: "TEST – fiktívne výdajné miesto", country: "SK" },
    shippingAddress: null,
    orderItems: [{ fileName: testFile, config: itemConfig, pricing: { total: 10 }, analysis: { dimsXmm: 40, dimsYmm: 30, dimsZmm: 20, volumeCm3: 12.5 } }],
  } as unknown as OrderWithItems;

  const draft = buildFlowiiZakazka(fakeOrder, { now, settings });
  const warning = "⚠ TESTOVACIA ZÁKAZKA z vytlacto3d.sk — iba na kontrolu napojenia, po kontrole ju zmažte.";
  draft.description = `${warning}\n\n${draft.description}`;
  draft.task.description = `${warning}\n\n${draft.task.description}`;
  draft.partner.note = `${warning} ${draft.partner.note ?? ""}`.trim();

  const existingPartnerId = await findExistingPartner(client, refs.companyId, draft.partner);
  const partnerId =
    existingPartnerId ?? (await client.create("/partners", refs.companyId, buildPartnerBody(draft.partner, refs)));

  let created: { id: string; optionalApplied: boolean };
  try {
    created = await createOrder(client, draft, refs, partnerId, now);
  } catch (e: any) {
    throw new FlowiiError(`${e?.message ?? e} (testovací partner ID ${partnerId} už existuje)`, e?.status, e?.body);
  }
  const orderId = created.id;

  let taskId: string;
  let taskName: string;
  try {
    const taskDraft = numberedTaskDraft(draft, await readOrderSerial(client, refs, orderId));
    taskName = taskDraft.task.title;
    taskId = await client.create("/tasks", refs.companyId, buildTaskBody(taskDraft, taskRefs, partnerId, orderId));
  } catch (e: any) {
    throw new FlowiiError(`${e?.message ?? e} (testovacia zákazka ID ${orderId} už vznikla)`, e?.status, e?.body);
  }

  return {
    partnerId,
    partnerReused: Boolean(existingPartnerId),
    orderId,
    taskId,
    name: draft.name,
    taskName,
    orderNumber: draft.orderNumber,
    note: orderNotes(refs, draft, created.optionalApplied, settings),
  };
}

// ── Test pripojenia (len čítanie) ──────────────────────────────────────────

export type FlowiiCheckResult = {
  ok: boolean;
  errors: string[];
  companies: { id: string; name: string }[];
  companyId: string | null;
  resolved: Record<string, string>;
  available: Record<string, string[]>;
};

/** Overí prihlásenie a či sa všetky názvy z nastavení dajú nájsť. Nič nevytvára. */
export async function checkFlowiiConnection(): Promise<FlowiiCheckResult> {
  const result: FlowiiCheckResult = { ok: false, errors: [], companies: [], companyId: null, resolved: {}, available: {} };
  const creds = getFlowiiCredentials();
  if (!creds) {
    result.errors.push("Chýbajú premenné FLOWII_API_KEY, FLOWII_USERNAME alebo FLOWII_PASSWORD.");
    return result;
  }

  const client = new FlowiiClient(creds);
  const settings = getFlowiiSettings();
  try {
    // Test vždy číta čerstvé údaje; bežné zakladanie zákaziek používa pamäť.
    clearFlowiiCache();
    const ref = await loadRefData(client, refCacheKey(creds));
    result.companies = ref.companies.map((c) => ({ id: String(c.id), name: String(c.attributes?.name ?? "") }));
    result.companyId = ref.companyId;

    const names = (items: JsonApiResource[]) => items.map((i) => String(i.attributes?.name ?? "")).filter(Boolean);
    result.available = {
      "Používatelia": names(ref.users),
      "Typy zákaziek": names(ref.orderTypes),
      "Stavy zákaziek": names(ref.orderStates),
      "Typy činností": names(ref.activityTypes),
      "Firmy (fakturačné údaje)": names(ref.companyData),
      "Vlastné polia zákazky": names(ref.orderCustomFields),
    };

    const refs = resolveRefs(ref, settings);
    const taskRefs = resolveTaskRefs(ref, settings);
    const byId = (items: JsonApiResource[], id: string) => `${items.find((i) => i.id === id)?.attributes?.name ?? "?"} (ID ${id})`;
    result.resolved = {
      "Firma": byId(ref.companyData, refs.companyDataId),
      "Detail → objednávka": refs.orderNumberFieldId
        ? byId(ref.orderCustomFields, refs.orderNumberFieldId)
        : `NENAŠLO SA pole "${settings.orderNumberFieldName}" — číslo objednávky sa nevyplní`,
      "Typ zákazky": byId(ref.orderTypes, refs.orderTypeId),
      "Stav zákazky": byId(ref.orderStates, refs.orderStateId),
      "Zodpovedný": refs.responsibleUserIds.map((id) => byId(ref.users, id)).join(", "),
      "Riešitelia úlohy": taskRefs.assigneeUserIds.map((id) => byId(ref.users, id)).join(", "),
      "Typ činnosti": byId(ref.activityTypes, taskRefs.activityTypeId),
      "API používateľ": `ID ${refs.selfUserId}`,
    };
    result.ok = true;
  } catch (e: any) {
    result.errors.push(e?.message ?? String(e));
    // Pri odmietnutom prihlásení pomôže vidieť, s čím sa web prihlasuje —
    // meno čiastočne skryté, z hesla len to, či má okolo seba medzery.
    if (e instanceof FlowiiError && e.status && e.status >= 400 && e.status < 500 && /Prihlásenie/.test(e.message)) {
      result.errors.push(`Prihlasovacie meno vo Verceli: ${maskLogin(creds.username)}`);
      const raw = process.env.FLOWII_PASSWORD ?? "";
      if (raw !== raw.trim()) {
        result.errors.push("Heslo vo Verceli má na začiatku alebo na konci medzeru či prázdny riadok — vložte ho znova bez nich.");
      }
      const rawUser = process.env.FLOWII_USERNAME ?? "";
      if (rawUser !== rawUser.trim()) {
        result.errors.push("Meno vo Verceli má okolo seba medzery (web ich odstraňuje, ale oplatí sa ich opraviť).");
      }
    }
  }
  return result;
}

/** "david@4frommedia.sk" → "da•••@4frommedia.sk", "admin" → "ad•••". */
function maskLogin(login: string): string {
  const [name, domain] = login.split("@");
  const visible = name.slice(0, Math.min(2, Math.max(1, name.length - 1)));
  return `${visible}•••${domain !== undefined ? `@${domain}` : ""} (${login.length} znakov)`;
}
