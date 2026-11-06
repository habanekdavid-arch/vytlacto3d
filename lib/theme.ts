/**
 * Tmavý režim je vypnutý — stránka je vždy svetlá.
 */

/**
 * Stránka je vždy svetlá: trieda .dark sa nepridáva (tmavé farby v
 * tailwind.config.ts / globals.css ostávajú pripravené, ak by sa niekedy
 * zapínal). Skript len zmaže starú voľbu z prepínača.
 */
export const THEME_INIT_SCRIPT = `(function(){try{localStorage.removeItem("vytlacto3d:theme");document.documentElement.classList.remove("dark");}catch(e){}})();`;

export function isDarkNow(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

/** Pozadie 3D náhľadu — v tmavom režime stredne sivé, aby bol vidieť aj čierny model. */
export function viewerBackground(): string {
  return isDarkNow() ? "#34373c" : "#F3F4F6";
}
