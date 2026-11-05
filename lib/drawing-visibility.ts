import { isAnalyticsHost } from "@/lib/analytics";

/**
 * AI modelovanie zatiaľ nie je verejné: na www.vytlacto3d.sk / vytlacto3d.sk
 * sa neukáže ani nedá zavolať. Na vytlacto3d-5mxw.vercel.app (ten istý
 * produkčný deploy), náhľadoch a lokálne funguje — na testovanie.
 * Zverejnenie: vrátiť z tejto funkcie vždy true.
 */
export function drawingAiVisibleOnHost(host: string | null | undefined): boolean {
  return !isAnalyticsHost(host);
}
