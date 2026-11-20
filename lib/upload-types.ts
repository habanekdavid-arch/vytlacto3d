/**
 * Typ súboru pre nahrávanie podľa PRÍPONY, nie podľa toho, čo pošle
 * prehliadač. Android napr. označuje .stl ako application/vnd.ms-pki.stl
 * (kolízia s certifikátmi Windows) a Vercel Blob by súbor odmietol.
 */
const BY_EXT: Record<string, string> = {
  stl: "model/stl",
  obj: "model/obj",
  "3mf": "model/3mf",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  v3d: "application/octet-stream",
};

export function uploadContentType(name: string): string {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  return BY_EXT[ext] ?? "application/octet-stream";
}

/** Všetky typy, ktoré smie /api/blob/upload prijať (aj tie, čo posielajú prehliadače). */
export const BLOB_ALLOWED_CONTENT_TYPES = [
  ...new Set(Object.values(BY_EXT)),
  "model/stl",
  "application/sla",
  "application/vnd.ms-pki.stl",
  "application/x-navistar-stl",
  "model/x.stl-binary",
  "model/x.stl-ascii",
  "model/obj",
  "text/plain",
  "model/3mf",
  "application/vnd.ms-package.3dmanufacturing-3dmodel+xml",
  "application/octet-stream",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

/** Zrozumiteľná hláška namiesto technickej chyby úložiska. */
export function friendlyUploadError(message: string | undefined | null): string | null {
  const m = String(message ?? "");
  if (/vercel blob|content type|contentType|blob/i.test(m)) {
    return "Súbor sa nepodarilo nahrať. Skúste to prosím znova, prípadne nám ho pošlite cez kontaktný formulár.";
  }
  if (/failed to fetch|network|load failed/i.test(m)) {
    return "Nahrávanie prerušilo pripojenie na internet. Skontrolujte pripojenie a skúste to znova.";
  }
  return null;
}
