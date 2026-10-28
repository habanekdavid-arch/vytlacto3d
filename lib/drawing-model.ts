/**
 * Technický výkres → 3D model (AI). Spoločné pre prehliadač aj server:
 * poplatok, limity súborov a rozpoznanie vygenerovaného modelu podľa súboru.
 */

/** Poplatok za vygenerovanie modelu z výkresu, bez DPH, raz za položku. */
export const DRAWING_MODEL_FEE_EUR = 10;

/**
 * Vygenerovaný model sa nahrá s touto predponou mena súboru. Server podľa nej
 * pri cene pozná, že ide o model z výkresu (Blob ponechá začiatok mena).
 */
export const DRAWING_MODEL_PREFIX = "vykres-ai-";

/** Výkres ide priamo na server (limit tela požiadavky na Verceli je 4,5 MB). */
export const DRAWING_MAX_BYTES = 4 * 1024 * 1024;

export const DRAWING_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp";

export const DRAWING_MEDIA_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"] as const;
export type DrawingMediaType = (typeof DRAWING_MEDIA_TYPES)[number];

/** Poznámka zákazníka k výkresu (napr. chýbajúca hrúbka). */
export const DRAWING_NOTE_MAX_CHARS = 500;

export function drawingFeeForFileKey(fileKey: unknown): number {
  if (typeof fileKey !== "string" || !fileKey) return 0;
  let path: string;
  try {
    path = new URL(fileKey, "https://vytlacto3d.sk").pathname;
  } catch {
    return 0;
  }
  const name = decodeURIComponent(path.split("/").pop() ?? "");
  return name.startsWith(DRAWING_MODEL_PREFIX) ? DRAWING_MODEL_FEE_EUR : 0;
}

/** Odpoveď /api/drawing-to-model. */
export type DrawingModelResult = {
  stlBase64: string;
  fileName: string;
  partName: string;
  summary: string;
  assumptions: string[];
  warnings: string[];
  confidence: "high" | "medium" | "low";
  dims: { x: number; y: number; z: number };
};
