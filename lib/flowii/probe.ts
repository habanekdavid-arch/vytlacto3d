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

  // Pomaly — FLOWii pri rýchlom slede požiadaviek vracia 429. Pri dennom
  // limite sa prieskum zastaví (ďalšie pokusy by len míňali limit).
  let stopped = false;
  const tryGet = async (path: string, query: Record<string, string | number | undefined> = q) => {
    if (stopped) return null;
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const json = await client.get(path, query);
      const s = sampleOf(json);
      results.push({ path, status: 200, count: s.count, sample: s.included ? { ...((s.sample as object) ?? {}), included: s.included } : s.sample });
      return json;
    } catch (e) {
      const body = e instanceof FlowiiError ? String(e.body ?? "").slice(0, 300) : "";
      results.push({
        path,
        status: e instanceof FlowiiError ? e.status ?? "?" : "?",
        error: `${String((e as Error).message).slice(0, 160)}${body ? ` — ${body}` : ""}`,
      });
      if (/per\s*day/i.test(body)) {
        stopped = true;
        results.push({ path: "(prieskum zastavený)", status: "-", error: "Denný limit FLOWii je vyčerpaný — skúste prieskum zajtra ráno." });
      }
      return null;
    }
  };

  // Úplný výpis (číselníky a existujúca faktúra) — kompaktne, bez skracovania zoznamov.
  const full: Record<string, unknown> = {};
  const getFull = async (label: string, path: string, query: Record<string, string | number | undefined> = q) => {
    const json = await tryGet(path, query);
    if (!json) return null;
    const pick = (r: any) => ({ type: r.type, id: r.id, attributes: r.attributes, relationships: r.relationships, links: r.links });
    full[label] = {
      data: Array.isArray(json.data) ? json.data.map(pick) : json.data ? pick(json.data) : null,
      included: Array.isArray(json.included) ? json.included.map(pick) : undefined,
    };
    return json;
  };
  const names = async (label: string, path: string) => {
    const json = await tryGet(path);
    if (json) full[label] = (Array.isArray(json.data) ? json.data : []).map((r: any) => `${r.id}: ${r.attributes?.name ?? JSON.stringify(r.attributes)}`);
  };

  // Číselníky pre faktúru.
  await names("Spôsoby úhrady", "/paymentmethods");
  await names("Bankové účty", "/bankaccounts");
  await names("Jednotky", "/units");
  await names("Vlastné polia zákazky", "/orders/customfields");

  // Existujúca faktúra (napr. 3026033) — cez doklady zákazky tejto objednávky.
  if (opts.webOrderId) {
    const sync = await prisma.flowiiSync.findUnique({ where: { orderId: opts.webOrderId } }).catch(() => null);
    if (sync?.flowiiOrderId) {
      const oid = encodeURIComponent(sync.flowiiOrderId);
      await getFull("Zákazka (vlastné polia)", `/orders/${oid}`, { ...q, include: "custom-field-string-values" });
      // Úplný zoznam dokladov vrátane relationships/links — odkazy "related"
      // prezradia cesty k položkám a úhradám faktúry.
      const docs = await getFull("Doklady zákazky", `/orders/${oid}/documents`);
      const list: any[] = Array.isArray(docs?.data) ? docs.data : [];
      const doc = list.find((d) => !opts.invoiceNumber || d.attributes?.["serial-nr"] === opts.invoiceNumber) ?? list[0];
      if (doc) {
        const did = encodeURIComponent(doc.id);
        // Kolo 4: /documents/{id} vracia 404 — skúšajú sa vnorené cesty pod zákazkou.
        await getFull("Faktúra (pod zákazkou)", `/orders/${oid}/documents/${did}`);
        await getFull("Faktúra (invoices)", `/orders/${oid}/invoices/${did}`);
        await getFull("Faktúra (/invoices)", `/invoices/${did}`);
        for (const sub of ["items", "payments", "document-items", "document-payments"]) {
          await getFull(`Faktúra → ${sub}`, `/orders/${oid}/documents/${did}/${sub}`);
        }
        await getFull("Doklady zákazky (include)", `/orders/${oid}/documents`, { ...q, include: "items,payments" });
        // Relationships uvedené priamo v doklade (ich links.related).
        for (const [rel, val] of Object.entries((doc.relationships ?? {}) as Record<string, any>)) {
          const related = val?.links?.related;
          if (typeof related === "string") {
            const path = related.replace(/^https?:\/\/[^/]+/, "").replace(/^\/v\d+/, "");
            await getFull(`Faktúra → rel ${rel}`, path.split("?")[0]);
          }
        }
        const partnerId = (doc.relationships as any)?.partner?.data?.id ?? "8834343";
        await getFull("Doklady partnera", `/partners/${encodeURIComponent(partnerId)}/documents`);
        await names("Sadzby DPH", "/vatrates");
        await names("Číselné rady", "/numberseries");
        await names("Typy dokladov", "/documenttypes");
      } else {
        results.push({ path: "(faktúra)", status: "-", error: "Zákazka tejto objednávky nemá doklad." });
      }
    } else {
      results.push({ path: "(zákazka)", status: "-", error: "Objednávka nemá zákazku vo FLOWii vytvorenú cez web." });
    }
  }

  // Len stavy (bez vzoriek) — úplné dáta sú v `full`.
  for (const r of results) delete (r as { sample?: unknown }).sample;
  return { companyId, companies: companies.map((c) => ({ id: c.id, name: c.attributes?.name })), results, full };
}
