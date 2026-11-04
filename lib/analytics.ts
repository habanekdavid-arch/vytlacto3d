/**
 * Google Tag Manager a Google Analytics len na produkčnej doméne — náhľady
 * na *.vercel.app a lokálny vývoj by v GA4 vytvárali cudzie domény a dáta.
 * Administrácia (/admin) sa nemeria nikde.
 */
export const GTM_ID = "GTM-WJQXS4CW";
export const GA_MEASUREMENT_ID = "G-FPVFGRHLWJ";

const PRODUCTION_HOSTS = ["www.vytlacto3d.sk", "vytlacto3d.sk"];

export function isAnalyticsHost(host: string | null | undefined): boolean {
  const name = (host ?? "").toLowerCase().split(":")[0];
  return PRODUCTION_HOSTS.includes(name);
}

export function isUntrackedPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
