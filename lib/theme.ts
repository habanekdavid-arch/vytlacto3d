/**
 * Tmavý režim: „auto“ podľa systému (predvolené), alebo natrvalo svetlý /
 * tmavý podľa prepínača v hlavičke (localStorage). Trieda .dark na <html>
 * prepína farby (tailwind.config.ts, app/globals.css).
 */
export type ThemeChoice = "auto" | "light" | "dark";
export const THEME_KEY = "vytlacto3d:theme";

/** Spustí sa pred vykreslením stránky, aby neblikla svetlá verzia. */
export const THEME_INIT_SCRIPT = `(function(){try{var c=localStorage.getItem("${THEME_KEY}");var d=c==="dark"||(c!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export function readThemeChoice(): ThemeChoice {
  try {
    const c = localStorage.getItem(THEME_KEY);
    return c === "light" || c === "dark" ? c : "auto";
  } catch {
    return "auto";
  }
}

export function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(choice: ThemeChoice) {
  try {
    if (choice === "auto") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {}
  const dark = choice === "dark" || (choice === "auto" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
  window.dispatchEvent(new CustomEvent("vytlacto3d:theme", { detail: { dark } }));
}

export function isDarkNow(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

/** Pozadie 3D náhľadu — v tmavom režime stredne sivé, aby bol vidieť aj čierny model. */
export function viewerBackground(): string {
  return isDarkNow() ? "#34373c" : "#F3F4F6";
}
