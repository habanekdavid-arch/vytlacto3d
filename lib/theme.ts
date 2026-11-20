/**
 * Tmavý režim je vypnutý — stránka je vždy svetlá.
 */

/**
 * Začiatok skriptu: ochrana pred chybou „Failed to execute 'removeChild' on
 * 'Node'“ — prekladač stránky v prehliadači (Google Translate) prepisuje text,
 * ktorý spravuje React, a ten potom padne pri odstraňovaní. Známy postup z
 * React issue #11538: tolerovať uzol, ktorý už nie je na svojom mieste.
 *
 * Stránka je vždy svetlá: trieda .dark sa nepridáva (tmavé farby v
 * tailwind.config.ts / globals.css ostávajú pripravené, ak by sa niekedy
 * zapínal). Skript len zmaže starú voľbu z prepínača.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var P=Node.prototype,rc=P.removeChild,ib=P.insertBefore;P.removeChild=function(c){if(c&&c.parentNode!==this)return c;return rc.apply(this,arguments)};P.insertBefore=function(n,r){if(r&&r.parentNode!==this)return ib.call(this,n,null);return ib.apply(this,arguments)};}catch(e){}try{localStorage.removeItem("vytlacto3d:theme");document.documentElement.classList.remove("dark");if(localStorage.getItem("vytlacto3d:contact-notice-dismissed"))document.documentElement.classList.add("contact-notice-dismissed");}catch(e){}})();`;

export function isDarkNow(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

/** Pozadie 3D náhľadu — v tmavom režime stredne sivé, aby bol vidieť aj čierny model. */
export function viewerBackground(): string {
  return isDarkNow() ? "#34373c" : "#F3F4F6";
}
