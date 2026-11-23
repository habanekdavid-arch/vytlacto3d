import { prisma } from "@/lib/prisma";
import { FlowiiClient, FlowiiError, getFlowiiCredentials, type JsonApiResource } from "@/lib/flowii/client";

/**
 * Prieskum FLOWii API pre automatické faktúry — LEN ČÍTANIE (GET).
 *
 * Dokumentácia FLOWii API (apiary) je nedostupná, preto sa tvar faktúry,
 * úhrady a číselných radov zistí z existujúcich záznamov: skúšajú sa
 * pravdepodobné cesty a pri zákazke danej objednávky aj jej doklady.
 * Nič sa nezakladá ani nemení.
 */

export type ProbeEntry = { path: string; status: number | string; count?: number; sample?: unknown; error?: string };

/** Skráti hodnoty, aby výstup ostal čitateľný (dlhé texty, veľa položiek). */
function trim(value: unknown, depth = 0): unknown {
  if (depth > 6) return "…";
  if (typeof value === "string") return value.length > 200 ? `${value.slice(0, 200)}…` : value;
  if (Array.isArray(value)) return value.slice(0, 4).map((v) => trim(v, depth + 1)).concat(value.length > 4 ? [`… (+${value.length - 4})`] : []);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, trim(v, depth + 1)]));
  }
  return value;
}

function sampleOf(json: any) {
  const data = json?.data;
  const first: JsonApiResource | undefined = Array.isArray(data) ? data[0] : data;
  return {
    count: Array.isArray(data) ? data.length : data ? 1 : 0,
    sample: first ? trim({ type: first.type, id: first.id, attributes: first.attributes, relationships: first.relationships }) : null,
    included: Array.isArray(json?.included) ? trim(json.included.slice(0, 6).map((r: any) => ({ type: r.type, id: r.id, attributes: r.attributes }))) : undefined,
  };
}

export async function probeFlowiiInvoices(opts: { webOrderId?: string; invoiceNumber?: string }) {
  const creds = getFlowiiCredentials();
  if (!creds) return { error: "FLOWii nie je nastavené." };
  const client = new FlowiiClient(creds);
  const companies = await client.list("/companies");
  const companyId = String(process.env.FLOWII_COMPANY_ID?.trim() || companies[0]?.id || "");
  const q = { companyId };
  const results: ProbeEntry[] = [];

  const tryGet = async (path: string, query: Record<string, string | number | undefined> = q) => {
    try {
      const json = await client.get(path, query);
      const s = sampleOf(json);
      results.push({ path, status: 200, count: s.count, sample: s.included ? { ...((s.sample as object) ?? {}), included: s.included } : s.sample });
      return json;
    } catch (e) {
      results.push({ path, status: e instanceof FlowiiError ? e.status ?? "?" : "?", error: String((e as Error).message).slice(0, 200) });
      return null;
    }
  };

  // Číselníky, ktoré faktúra pravdepodobne potrebuje.
  for (const p of [
    "/invoices",
    "/issuedinvoices",
    "/documents",
    "/invoices/series",
    "/numberingseries",
    "/documentseries",
    "/paymentmethods",
    "/paymenttypes",
    "/payments",
    "/units",
    "/vatrates",
    "/bankaccounts",
    "/currencies",
    "/invoices/customfields",
  ]) {
    await tryGet(p);
  }

  // Konkrétna faktúra podľa čísla (napr. 3026033).
  if (opts.invoiceNumber) {
    for (const p of ["/invoices", "/documents"]) {
      const json = await tryGet(p, { ...q, "filter[search-text]": opts.invoiceNumber });
      const id = Array.isArray(json?.data) ? json.data[0]?.id : null;
      if (id) {
        await tryGet(`${p}/${encodeURIComponent(id)}`, { ...q, include: "items,payments" });
        await tryGet(`${p}/${encodeURIComponent(id)}/items`);
        await tryGet(`${p}/${encodeURIComponent(id)}/payments`);
      }
    }
  }

  // Zákazka tejto objednávky (z prenosu do FLOWii) a jej doklady / vlastné polia.
  if (opts.webOrderId) {
    const sync = await prisma.flowiiSync.findUnique({ where: { orderId: opts.webOrderId } }).catch(() => null);
    if (sync?.flowiiOrderId) {
      const oid = encodeURIComponent(sync.flowiiOrderId);
      await tryGet(`/orders/${oid}`, { ...q, include: "custom-field-string-values" });
      for (const p of [`/orders/${oid}/documents`, `/orders/${oid}/invoices`, `/orders/${oid}/payments`]) await tryGet(p);
    } else {
      results.push({ path: "(zákazka)", status: "-", error: "Objednávka nemá zákazku vo FLOWii vytvorenú cez web." });
    }
  }
  await tryGet("/orders/customfields");

  return { companyId, companies: companies.map((c) => ({ id: c.id, name: c.attributes?.name })), results };
}
