/**
 * Názov súboru do HTTP hlavičky. Hlavičky smú mať len znaky 0–255 — názov
 * s diakritikou (napr. „š“) by zhodil odpoveď chybou „Cannot convert
 * argument to a ByteString“. ASCII náhrada + plný názov v UTF-8 (RFC 6266).
 */
export function asciiFileName(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7e]/g, "_")
      .replace(/["\\]/g, "_") || "subor"
  );
}

export function contentDisposition(type: "attachment" | "inline", name: string): string {
  return `${type}; filename="${asciiFileName(name)}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
