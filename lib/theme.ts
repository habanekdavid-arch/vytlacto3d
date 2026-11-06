/**
 * Tmavý režim podľa nastavenia zariadenia (bez prepínača na stránke).
 * Trieda .dark na <html> prepína farby (tailwind.config.ts, app/globals.css).
 */

/** Spustí sa pred vykreslením stránky, aby neblikla svetlá verzia. */
export const THEME_INIT_SCRIPT = `(function(){try{localStorage.removeItem("vytlacto3d:theme");var m=window.matchMedia("(prefers-color-scheme: dark)");var a=function(){document.documentElement.classList.toggle("dark",m.matches);window.dispatchEvent(new Event("vytlacto3d:theme"));};a();m.addEventListener("change",a);}catch(e){}})();`;

export function isDarkNow(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

/** Pozadie 3D náhľadu — v tmavom režime stredne sivé, aby bol vidieť aj čierny model. */
export function viewerBackground(): string {
  return isDarkNow() ? "#34373c" : "#F3F4F6";
}
