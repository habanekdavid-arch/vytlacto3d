import { DOMParser } from "xmldom";
import { PACKETA_WIDGET_API_KEY } from "@/lib/packeta/constants";

/**
 * Klient pre Packeta REST API (XML). Dokumentácia:
 * https://docs.packeta.com/docs/getting-started/packeta-api
 *
 * API heslo nájdete v klientskej sekcii Packety (client.packeta.com →
 * Klientská podpora). Ukladá sa do PACKETA_API_PASSWORD vo Verceli.
 */

// PACKETA_API_URL len na testovanie proti napodobenine API.
const API_URL = process.env.PACKETA_API_URL?.trim() || "https://www.zasilkovna.cz/api/rest";

export class PacketaError extends Error {
  constructor(
    message: string,
    readonly fault?: string,
    readonly details: string[] = []
  ) {
    super(message);
    this.name = "PacketaError";
  }
}

export function getPacketaApiPassword(): string | null {
  // Pri vkladaní do Vercelu sa ľahko pribalia úvodzovky alebo medzery.
  const raw = process.env.PACKETA_API_PASSWORD?.trim().replace(/^["']+|["']+$/g, "").trim();
  return raw || null;
}


const INCORRECT_PASSWORD_HINT =
  "API heslo bolo odmietnuté. V klientskej sekcii Packety (client.packeta.com → Klientská podpora) skopírujte " +
  "„API heslo“ (32 znakov), nie „API kľúč“ (16 znakov), vložte ho do PACKETA_API_PASSWORD vo Verceli a nasaďte " +
  "web znova (Redeploy) — zmena premennej sa prejaví až po novom nasadení.";

/**
 * Bezpečný popis nastaveného hesla (bez jeho prezradenia) — na odhalenie
 * zámeny s API kľúčom, úvodzoviek alebo hesla z iného účtu.
 */
export function describePacketaPassword() {
  const pw = getPacketaApiPassword();
  if (!pw) return { set: false as const, problems: ["PACKETA_API_PASSWORD nie je nastavené."] };
  const problems: string[] = [];
  if (pw.length === 16) problems.push("Hodnota má 16 znakov — to je API kľúč, nie API heslo (32 znakov).");
  else if (pw.length !== 32) problems.push(`Hodnota má ${pw.length} znakov — API heslo Packety má 32 znakov.`);
  if (!/^[0-9a-f]+$/i.test(pw)) problems.push("Hodnota obsahuje iné znaky ako 0–9 a a–f — API heslo je hexadecimálny reťazec.");
  const matchesWidgetKey = pw.slice(0, 16).toLowerCase() === PACKETA_WIDGET_API_KEY;
  if (pw.length === 32 && !matchesWidgetKey) {
    problems.push("Začiatok hesla nesedí s API kľúčom widgetu na webe — heslo je pravdepodobne z iného účtu Packety.");
  }
  return {
    set: true as const,
    length: pw.length,
    hint: `${pw.slice(0, 4)}…${pw.slice(-2)}`,
    matchesWidgetKey,
    problems,
  };
}

export function isPacketaConfigured(): boolean {
  return getPacketaApiPassword() !== null;
}

/** Označenie odosielateľa (eshop) tak, ako je nastavené v klientskej sekcii Packety. */
export function getPacketaSender(): string {
  return process.env.PACKETA_SENDER?.trim() || "vytlacto3D.sk";
}

type XmlValue = string | number | boolean | null | undefined | XmlObject;
type XmlObject = { [key: string]: XmlValue };

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toXml(obj: XmlObject): string {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `<${k}>${typeof v === "object" ? toXml(v as XmlObject) : escapeXml(String(v))}</${k}>`)
    .join("");
}

function childText(el: Element | Document, name: string): string | null {
  const node = el.getElementsByTagName(name)[0];
  return node?.textContent?.trim() ?? null;
}

async function call(method: string, payload: XmlObject): Promise<Document> {
  const apiPassword = getPacketaApiPassword();
  if (!apiPassword) throw new PacketaError("Chýba PACKETA_API_PASSWORD.");

  const body = `<?xml version="1.0" encoding="utf-8"?><${method}>${toXml({ apiPassword, ...payload })}</${method}>`;

  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/xml; charset=utf-8" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    throw new PacketaError(`Packeta API je nedostupné: ${e instanceof Error ? e.message : String(e)}`);
  }

  const text = await res.text();
  const doc = new DOMParser().parseFromString(text, "text/xml");
  const status = childText(doc, "status");

  if (status !== "ok") {
    const fault = childText(doc, "fault") ?? undefined;
    const message = childText(doc, "string") ?? `HTTP ${res.status}`;
    // Chyby jednotlivých polí: <detail><attributes><fault><name>…</name><fault>…</fault></fault>…
    const details: string[] = [];
    const attrs = doc.getElementsByTagName("attributes")[0];
    if (attrs) {
      const faults = attrs.getElementsByTagName("fault");
      for (let i = 0; i < faults.length; i++) {
        const f = faults[i];
        const name = childText(f, "name");
        if (!name) continue;
        const inner = f.getElementsByTagName("fault")[0]?.textContent?.trim();
        details.push(inner ? `${name}: ${inner}` : name);
      }
    }
    if (fault === "IncorrectApiPasswordFault") throw new PacketaError(INCORRECT_PASSWORD_HINT, fault);
    throw new PacketaError(
      details.length ? `${message} (${details.join("; ")})` : message,
      fault,
      details
    );
  }

  return doc;
}

export type PacketAttributes = {
  /** Číslo objednávky — zobrazí sa na štítku. */
  number: string;
  name: string;
  surname: string;
  email?: string | null;
  phone?: string | null;
  /** ID výdajného miesta / Z-BOXu z widgetu. */
  addressId: string;
  /** Hodnota zásielky (poistenie). */
  value: number;
  currency: string;
  /** Hmotnosť v kg. */
  weight: number;
  eshop: string;
  /** Rozmery v mm (Z-BOX ich vyžaduje). */
  size?: { length: number; width: number; height: number };
};

export type CreatedPacket = { id: string; barcode: string; barcodeText: string };

export async function createPacket(attrs: PacketAttributes): Promise<CreatedPacket> {
  const doc = await call("createPacket", {
    packetAttributes: {
      number: attrs.number,
      name: attrs.name,
      surname: attrs.surname,
      email: attrs.email ?? undefined,
      phone: attrs.phone ?? undefined,
      addressId: attrs.addressId,
      value: attrs.value.toFixed(2),
      currency: attrs.currency,
      weight: attrs.weight.toFixed(2),
      eshop: attrs.eshop,
      size: attrs.size
        ? { length: Math.round(attrs.size.length), width: Math.round(attrs.size.width), height: Math.round(attrs.size.height) }
        : undefined,
    },
  });
  const id = childText(doc, "id");
  const barcode = childText(doc, "barcode");
  if (!id || !barcode) throw new PacketaError("Packeta nevrátila číslo zásielky.");
  return { id, barcode, barcodeText: childText(doc, "barcodeText") ?? barcode };
}

/** Formáty štítku podľa Packeta API. */
export const LABEL_FORMATS = ["A6 on A4", "A6 on A6", "A7 on A4", "A7 on A7", "A8 on A8", "105x35mm on A4"] as const;
export type LabelFormat = (typeof LABEL_FORMATS)[number];

export async function packetLabelPdf(packetId: string, format: LabelFormat = "A6 on A4"): Promise<Buffer> {
  const doc = await call("packetLabelPdf", { packetId, format, offset: 0 });
  const base64 = childText(doc, "result");
  if (!base64) throw new PacketaError("Packeta nevrátila PDF štítku.");
  return Buffer.from(base64, "base64");
}

/**
 * Overenie hesla bez vytvárania zásielky: dotaz na stav neexistujúcej
 * zásielky. Zlé heslo vráti IncorrectApiPasswordFault, správne heslo inú chybu.
 */
export async function checkPacketaConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    await call("packetStatus", { packetId: "1" });
    return { ok: true, message: "Pripojenie k Packete funguje." };
  } catch (e) {
    if (e instanceof PacketaError && e.fault === "IncorrectApiPasswordFault") return { ok: false, message: e.message };
    if (e instanceof PacketaError && e.fault) return { ok: true, message: "Pripojenie k Packete funguje — heslo je správne." };
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export function packetaTrackingUrl(barcode: string): string {
  return `https://tracking.packeta.com/sk/?id=${encodeURIComponent(barcode)}`;
}
