/**
 * Prílohy kontaktného formulára — spoločné pravidlá pre prehliadač aj server.
 * Súbory sa nahrávajú priamo do Vercel Blob (pod kontakt/), takže zvládnu aj
 * veľké 3D modely; do e-mailu idú ako príloha, a keď sú príliš veľké, ako odkaz.
 */

export const CONTACT_MAX_FILES = 5;
export const CONTACT_MAX_FILE_MB = 50;
export const CONTACT_BLOB_PREFIX = "kontakt/";

/** Koľko spolu môže mať príloh priamo v e-maile (base64 pridá ~33 %). */
export const CONTACT_EMAIL_ATTACH_MAX_BYTES = 15 * 1024 * 1024;

const GROUPS: Record<string, string[]> = {
  "3D modely": ["stl", "obj", "3mf", "step", "stp", "iges", "igs", "f3d", "fbx", "ply", "blend", "gcode", "amf", "scad"],
  "Výkresy": ["svg", "dxf", "dwg", "eps", "ai"],
  Obrázky: ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "bmp", "tif", "tiff"],
  Dokumenty: ["pdf", "doc", "docx", "odt", "rtf", "txt", "xls", "xlsx", "ods", "csv", "ppt", "pptx", "odp"],
  Archívy: ["zip", "rar", "7z"],
};

export const CONTACT_ALLOWED_EXTENSIONS = new Set(Object.values(GROUPS).flat());

/** Pre atribút accept v <input type="file">. */
export const CONTACT_ACCEPT = [...CONTACT_ALLOWED_EXTENSIONS].map((e) => `.${e}`).join(",");

/** Krátky popis podporovaných formátov pre zákazníka. */
export const CONTACT_FORMATS_HINT = "3D modely (STL, OBJ, 3MF, STEP…), obrázky, PDF, Word, Excel, DXF/DWG, ZIP";

export function fileExtension(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim());
  return m ? m[1].toLowerCase() : "";
}

export function isAllowedContactFile(name: string): boolean {
  return CONTACT_ALLOWED_EXTENSIONS.has(fileExtension(name));
}

/** Bezpečný názov súboru pre úložisko (bez diakritiky a medzier). */
export function safeContactFileName(name: string): string {
  const ext = fileExtension(name);
  const base = name
    .slice(0, ext ? -(ext.length + 1) : undefined)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_.]+|[_.]+$/g, "")
    .slice(0, 80);
  return `${base || "priloha"}${ext ? `.${ext}` : ""}`;
}

export type ContactAttachment = {
  url: string;
  name: string;
  size: number;
  contentType: string;
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
