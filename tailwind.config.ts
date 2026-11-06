import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";
import plugin from "tailwindcss/plugin";

/**
 * Tmavý režim (trieda .dark na <html>, pozri lib/theme.ts).
 *
 * Farby z Tailwindu idú cez CSS premenné, ktoré sa v tmavom režime prepnú —
 * stránky netreba prepisovať triedou dark: pri každom prvku:
 * - neutral/gray/zinc/slate/stone: zvlášť pre text, pozadie a okraje
 *   (text-neutral-900 → takmer biely, bg-neutral-50 → takmer čierne,
 *   tmavé tlačidlá bg-neutral-900 ostanú tmavé),
 * - farebné (red, green, amber…): svetlé odtiene 50–200 sa stanú tmavými
 *   tónmi, tmavé 700–900 svetlými — odznaky a hlášky ostanú čitateľné.
 * Biela/čierna a zvyšok (žlté tlačidlá, logá) rieši app/globals.css.
 */

type Rgb = [number, number, number];
const hex = (h: string): Rgb => {
  const s = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)) as Rgb;
};
const mix = (a: Rgb, b: Rgb, t: number): Rgb => a.map((v, i) => Math.round(v * t + b[i] * (1 - t))) as Rgb;
const css = (c: Rgb) => c.join(" ");

const SHADES = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] as const;
const NEUTRALS = ["neutral", "gray", "zinc", "slate", "stone"] as const;
const HUES = [
  "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal",
  "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose",
] as const;

const DARK_BASE = hex("#141414");

// Tmavé hodnoty neutrálnych farieb podľa použitia.
const DARK_TEXT: Record<string, string> = {
  "50": "#1c1c1c", "100": "#2a2a2a", "200": "#3d3d3d", "300": "#5e5e5e", "400": "#7c7c7c",
  "500": "#9a9a9a", "600": "#b4b4b4", "700": "#cdcdcd", "800": "#e2e2e2", "900": "#f2f2f2", "950": "#fafafa",
};
const DARK_BG: Record<string, string> = {
  "50": "#0e0e0e", "100": "#1d1d1d", "200": "#2a2a2a", "300": "#383838", "400": "#4a4a4a",
  "500": "#5f5f5f", "600": "#525252", "700": "#3f3f3f", "800": "#333333", "900": "#2a2a2a", "950": "#0a0a0a",
};
const DARK_BORDER: Record<string, string> = {
  "50": "#1a1a1a", "100": "#232323", "200": "#2f2f2f", "300": "#3e3e3e", "400": "#565656",
  "500": "#737373", "600": "#8f8f8f", "700": "#b0b0b0", "800": "#cfcfcf", "900": "#e5e5e5", "950": "#f5f5f5",
};

/** Farebné odtiene v tmavom režime (svetlé ↔ tmavé). */
function darkHue(name: (typeof HUES)[number], shade: string): Rgb {
  const p = colors[name] as Record<string, string>;
  const c = (s: string) => hex(p[s]);
  switch (shade) {
    case "50": return mix(c("500"), DARK_BASE, 0.12);
    case "100": return mix(c("500"), DARK_BASE, 0.2);
    case "200": return mix(c("500"), DARK_BASE, 0.34);
    case "300": return mix(c("400"), DARK_BASE, 0.55);
    case "400": return c("400");
    case "500": return c("500");
    case "600": return c("500");
    case "700": return c("300");
    case "800": return c("200");
    case "900": return c("100");
    default: return c("50");
  }
}

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;
const scale = (prefix: string) => Object.fromEntries(SHADES.map((s) => [s, v(`${prefix}-${s}`)]));

const light: Record<string, string> = {};
const dark: Record<string, string> = {};
for (const s of SHADES) {
  const n = hex((colors.neutral as Record<string, string>)[s]);
  light[`tn-${s}`] = light[`bn-${s}`] = light[`dn-${s}`] = css(n);
  dark[`tn-${s}`] = css(hex(DARK_TEXT[s]));
  dark[`bn-${s}`] = css(hex(DARK_BG[s]));
  dark[`dn-${s}`] = css(hex(DARK_BORDER[s]));
  for (const h of HUES) {
    light[`${h}-${s}`] = css(hex((colors[h] as Record<string, string>)[s]));
    dark[`${h}-${s}`] = css(darkHue(h, s));
  }
}
const toVars = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).map(([k, val]) => [`--${k}`, val]));

const hueColors = Object.fromEntries(HUES.map((h) => [h, scale(h)]));
const neutralAs = (prefix: string) => Object.fromEntries(NEUTRALS.map((n) => [n, scale(prefix)]));

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        century: ['"Century Gothic Paneuropean"', "Arial", "sans-serif"],
      },
      colors: { ...hueColors, ...neutralAs("tn") },
      textColor: neutralAs("tn"),
      placeholderColor: neutralAs("tn"),
      backgroundColor: neutralAs("bn"),
      gradientColorStops: neutralAs("bn"),
      borderColor: neutralAs("dn"),
      divideColor: neutralAs("dn"),
      ringColor: neutralAs("dn"),
      outlineColor: neutralAs("dn"),
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({ ":root": toVars(light), "html.dark": toVars(dark) });
    }),
  ],
};

export default config;
