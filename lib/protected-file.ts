import crypto from "node:crypto";
import zlib from "node:zlib";

/**
 * Chránené súbory .v3d — model, SVG alebo obrázok zamknutý tak, že ho
 * otvorí len náš konfigurátor (server ho rozšifruje). V inom programe,
 * slicery ani u inej tlačiarne sa nedá použiť. Obsah sa nemení, cena sa
 * počíta z pôvodného modelu.
 *
 * Formát: "V3D1" | iv (12 B) | tag (16 B) | AES-256-GCM( dĺžka hlavičky
 * (4 B) | hlavička JSON | deflate(pôvodný súbor) ).
 *
 * Kľúč: PROTECTED_FILE_SECRET, inak NEXTAUTH_SECRET. Po jeho zmene sa
 * staršie .v3d súbory už neotvoria.
 */

export const PROTECTED_EXT = ".v3d";
export const PROTECTABLE_EXTS = [".stl", ".obj", ".svg", ".png", ".jpg", ".jpeg", ".webp"];
const MAGIC = Buffer.from("V3D1");
const MAX_BYTES = 100 * 1024 * 1024;

export class ProtectedFileError extends Error {}

export type ProtectedHeader = {
  name: string;
  type: string;
  createdAt: string;
  createdBy?: string | null;
  /** Nastavenie z konfigurátora (export položky adminom) — vloží sa s modelom. */
  config?: ProtectedConfig;
};

/** Parametre položky, ktoré si .v3d nesie (bez URL podkladov a interných príznakov). */
export type ProtectedConfig = {
  material?: string;
  quality?: string;
  infillPct?: number;
  color?: string;
  quantity?: number;
  scalePct?: number;
  materialFlexible?: boolean;
  colorFlexible?: boolean;
  partColors?: string[];
};

/** Prepustí len známe kľúče so správnym typom (obsah .v3d nie je dôveryhodný vstup). */
export function sanitizeConfig(raw: unknown): ProtectedConfig | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const out: ProtectedConfig = {};
  const str = (v: unknown) => (typeof v === "string" && /^[A-Za-z0-9_-]{1,24}$/.test(v) ? v : undefined);
  const num = (v: unknown, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : undefined;
  if (str(r.material)) out.material = str(r.material);
  if (str(r.quality)) out.quality = str(r.quality);
  if (str(r.color)) out.color = str(r.color);
  if (num(r.infillPct, 0, 100) !== undefined) out.infillPct = num(r.infillPct, 0, 100);
  if (num(r.quantity, 1, 10000) !== undefined) out.quantity = Math.round(num(r.quantity, 1, 10000)!);
  if (num(r.scalePct, 1, 1000) !== undefined) out.scalePct = num(r.scalePct, 1, 1000);
  if (typeof r.materialFlexible === "boolean") out.materialFlexible = r.materialFlexible;
  if (typeof r.colorFlexible === "boolean") out.colorFlexible = r.colorFlexible;
  if (Array.isArray(r.partColors) && r.partColors.length <= 64 && r.partColors.every((c) => str(c))) {
    out.partColors = r.partColors as string[];
  }
  return Object.keys(out).length ? out : undefined;
}

function key(): Buffer {
  const secret = process.env.PROTECTED_FILE_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new ProtectedFileError("Chýba tajný kľúč pre chránené súbory.");
  return Buffer.from(crypto.hkdfSync("sha256", secret, "vytlacto3d", "protected-file-v1", 32));
}

export function isProtectableName(name: string): boolean {
  const n = name.toLowerCase();
  return PROTECTABLE_EXTS.some((e) => n.endsWith(e));
}

export function protectFile(data: Buffer, header: ProtectedHeader): Buffer {
  if (data.length > MAX_BYTES) throw new ProtectedFileError("Súbor je väčší ako 100 MB.");
  const head = Buffer.from(JSON.stringify(header), "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(head.length);
  const plain = Buffer.concat([len, head, zlib.deflateRawSync(data, { level: 6 })]);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(MAGIC);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), enc]);
}

export function openProtectedFile(file: Buffer): { header: ProtectedHeader; data: Buffer } {
  if (file.length < 36 || !file.subarray(0, 4).equals(MAGIC)) {
    throw new ProtectedFileError("Toto nie je chránený súbor VytlačTo3D.");
  }
  const iv = file.subarray(4, 16);
  const tag = file.subarray(16, 32);
  let plain: Buffer;
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAAD(MAGIC);
    decipher.setAuthTag(tag);
    plain = Buffer.concat([decipher.update(file.subarray(32)), decipher.final()]);
  } catch {
    throw new ProtectedFileError("Chránený súbor sa nepodarilo otvoriť (je poškodený alebo nie je od nás).");
  }
  const len = plain.readUInt32BE(0);
  const header = JSON.parse(plain.subarray(4, 4 + len).toString("utf8")) as ProtectedHeader;
  const data = zlib.inflateRawSync(plain.subarray(4 + len), { maxOutputLength: MAX_BYTES });
  return { header, data };
}

/** Bezpečné meno súboru (bez diakritiky a zvláštnych znakov). */
export function safeFileName(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_")
      .slice(-120) || "subor"
  );
}

export function contentTypeFor(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith(".svg")) return "image/svg+xml";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".stl")) return "model/stl";
  return "application/octet-stream";
}
