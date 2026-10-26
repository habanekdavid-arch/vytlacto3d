/**
 * Viacfarebný obrázok / SVG → farebné vrstvy na vytiahnutie do 3D.
 *
 * Obrázok sa rozloží na niekoľko hlavných farieb (k-means v priestore Lab,
 * hrany a vyhladené prechody sa do odhadu farieb nepočítajú), pozadie sa
 * oddelí (priehľadnosť PNG alebo farba, ktorá prevláda na okraji) a každá
 * farba dostane vlastné hladké obrysy rovnakou cestou ako jednofarebný
 * prevod (lib/image-to-svg). Každej farbe sa priradí najbližšia farba
 * z našej palety — zákazník ju aj výšku vrstvy môže zmeniť.
 */
import { MULTICOLOR_MAX_COLORS } from "@/lib/multicolor";
import { blurForTrace, traceLoops, type Point } from "@/lib/image-to-svg";

/** Farby, ktoré tlačíme (id ako v konfigurátore) a ich vzhľad. */
export const PALETTE_HEX: Record<string, string> = {
  black: "#111111",
  white: "#F3F4F6",
  gray: "#9CA3AF",
  red: "#DC2626",
  blue: "#2563EB",
  green: "#16A34A",
  purple: "#9333EA",
  orange: "#F97316",
};

export type ColorLayer = {
  /** Farba v obrázku (#rrggbb). */
  hex: string;
  /** Najbližšia farba z palety (id). */
  colorId: string;
  /** Podiel plochy obrázka 0–1. */
  share: number;
  /** Obrysy v mm (Y nahor), uzavreté slučky. */
  loops: Point[][];
  /** Pozadie obrázka — ako podložka je voliteľné. */
  background?: boolean;
};

export type LayerExtraction = {
  layers: ColorLayer[];
  /** Rozmery obrázka v mm. */
  widthMm: number;
  heightMm: number;
};

// --- farby -----------------------------------------------------------------

function srgbToLinear(c: number) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

const LIN = Array.from({ length: 256 }, (_, i) => srgbToLinear(i));

function labF(t: number) {
  return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
}

export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const R = LIN[r], G = LIN[g], B = LIN[b];
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const fx = labF(x), fy = labF(y), fz = labF(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const PALETTE_LAB = Object.entries(PALETTE_HEX).map(([id, hex]) => ({ id, lab: rgbToLab(...hexToRgb(hex)) }));

function dist2(a: readonly number[], b: readonly number[]) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

/** Najbližšia farba z palety k farbe z obrázka. */
export function nearestPaletteColor(hex: string): string {
  const lab = rgbToLab(...hexToRgb(hex));
  let best = PALETTE_LAB[0];
  for (const p of PALETTE_LAB) if (dist2(lab, p.lab) < dist2(lab, best.lab)) best = p;
  return best.id;
}

function toHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

// --- rozklad na farby -------------------------------------------------------

// Farby bližšie ako toto (ΔE v Lab) sú jedna farba.
const MERGE_DE = 14;
// Hrana = pixel, ktorý sa od suseda líši viac ako toto — do odhadu farieb nejde.
const EDGE_DE = 8;
// Farba menšia ako tento podiel plochy je šum alebo prechod.
const MIN_SHARE = 0.004;
const KMEANS_K = 8;
const KMEANS_SAMPLE = 40000;

type Cluster = { lab: [number, number, number]; rgb: [number, number, number]; count: number };

/**
 * Rozloží pixely na vrstvy. Vráti null, ak má obrázok (bez pozadia) len
 * jednu farbu — vtedy stačí doterajší jednofarebný prevod.
 */
export function extractColorLayers(
  w: number,
  h: number,
  data: Uint8ClampedArray,
  scale: number,
  mmPerPx: number
): LayerExtraction | null {
  const n = w * h;
  const L = new Float32Array(n), A = new Float32Array(n), B = new Float32Array(n);
  const opaque = new Uint8Array(n);
  let transparentCount = 0;
  for (let i = 0; i < n; i++) {
    const a = data[i * 4 + 3];
    if (a < 128) {
      transparentCount++;
      continue;
    }
    opaque[i] = 1;
    const lab = rgbToLab(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    L[i] = lab[0];
    A[i] = lab[1];
    B[i] = lab[2];
  }
  const hasAlpha = transparentCount > n * 0.02;

  // Pixely na rovnej ploche (nie hrana ani vyhladený prechod) — z nich sa
  // odhadnú farby.
  const flat: number[] = [];
  const e2 = EDGE_DE * EDGE_DE;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!opaque[i]) continue;
      let edge = false;
      for (const j of [i - 1, i + 1, i - w, i + w]) {
        if (!opaque[j] || (L[i] - L[j]) ** 2 + (A[i] - A[j]) ** 2 + (B[i] - B[j]) ** 2 > e2) {
          edge = true;
          break;
        }
      }
      if (!edge) flat.push(i);
    }
  }
  if (flat.length < 50) return null;

  // k-means++ na vzorke
  const step = Math.max(1, Math.floor(flat.length / KMEANS_SAMPLE));
  const sample: number[] = [];
  for (let k = 0; k < flat.length; k += step) sample.push(flat[k]);
  let seed = 12345;
  const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const centers: [number, number, number][] = [];
  const first = sample[Math.floor(rand() * sample.length)];
  centers.push([L[first], A[first], B[first]]);
  const d = new Float64Array(sample.length).fill(Infinity);
  while (centers.length < KMEANS_K) {
    const c = centers[centers.length - 1];
    let sum = 0;
    for (let k = 0; k < sample.length; k++) {
      const i = sample[k];
      d[k] = Math.min(d[k], (L[i] - c[0]) ** 2 + (A[i] - c[1]) ** 2 + (B[i] - c[2]) ** 2);
      sum += d[k];
    }
    if (sum <= 0) break;
    let r = rand() * sum, pick = sample[0];
    for (let k = 0; k < sample.length; k++) {
      r -= d[k];
      if (r <= 0) {
        pick = sample[k];
        break;
      }
    }
    centers.push([L[pick], A[pick], B[pick]]);
  }
  for (let it = 0; it < 12; it++) {
    const acc = centers.map(() => [0, 0, 0, 0]);
    for (const i of sample) {
      let best = 0, bd = Infinity;
      for (let c = 0; c < centers.length; c++) {
        const dd = (L[i] - centers[c][0]) ** 2 + (A[i] - centers[c][1]) ** 2 + (B[i] - centers[c][2]) ** 2;
        if (dd < bd) { bd = dd; best = c; }
      }
      const s = acc[best];
      s[0] += L[i]; s[1] += A[i]; s[2] += B[i]; s[3]++;
    }
    acc.forEach((s, c) => {
      if (s[3]) centers[c] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
    });
  }

  // Zlúčiť podobné farby
  let clusters: Cluster[] = centers.map((lab) => ({ lab, rgb: [0, 0, 0], count: 0 }));
  const merge = () => {
    for (let a = 0; a < clusters.length; a++) {
      for (let b = a + 1; b < clusters.length; b++) {
        if (dist2(clusters[a].lab, clusters[b].lab) < MERGE_DE * MERGE_DE) {
          const ca = clusters[a], cb = clusters[b];
          const wa = ca.count || 1, wb = cb.count || 1;
          ca.lab = [0, 1, 2].map((k) => (ca.lab[k] * wa + cb.lab[k] * wb) / (wa + wb)) as [number, number, number];
          ca.count += cb.count;
          clusters.splice(b, 1);
          return true;
        }
      }
    }
    return false;
  };
  while (merge());

  // Priradenie všetkých pixelov + priemerná farba v RGB
  const label = new Int8Array(n).fill(-1);
  const assign = () => {
    const sums = clusters.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) {
      if (!opaque[i]) { label[i] = -1; continue; }
      let best = 0, bd = Infinity;
      for (let c = 0; c < clusters.length; c++) {
        const lab = clusters[c].lab;
        const dd = (L[i] - lab[0]) ** 2 + (A[i] - lab[1]) ** 2 + (B[i] - lab[2]) ** 2;
        if (dd < bd) { bd = dd; best = c; }
      }
      label[i] = best;
      const s = sums[best];
      s[0] += data[i * 4]; s[1] += data[i * 4 + 1]; s[2] += data[i * 4 + 2]; s[3]++;
    }
    clusters.forEach((c, k) => {
      const s = sums[k];
      c.count = s[3];
      if (s[3]) c.rgb = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
    });
  };
  assign();
  // Drobné farby (šum, prechody) preč a znova priradiť
  const opaqueCount = n - transparentCount;
  const kept = clusters.filter((c) => c.count >= opaqueCount * MIN_SHARE);
  if (kept.length !== clusters.length && kept.length > 0) {
    clusters = kept;
    assign();
  }

  // Pozadie: priehľadnosť, inak farba prevládajúca na okraji obrázka
  let backgroundIdx = -1;
  if (!hasAlpha) {
    const border = new Array(clusters.length).fill(0);
    let all = 0;
    const count = (i: number) => {
      if (label[i] >= 0) border[label[i]]++;
      all++;
    };
    for (let x = 0; x < w; x++) { count(x); count((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { count(y * w); count(y * w + w - 1); }
    const top = border.indexOf(Math.max(...border));
    if (border[top] >= all * 0.4) backgroundIdx = top;
  }

  // Najviac MULTICOLOR_MAX_COLORS farieb popredia — menšie sa pridajú k najbližšej
  let fg = clusters.map((c, k) => ({ c, k })).filter(({ k }) => k !== backgroundIdx);
  fg.sort((a, b) => b.c.count - a.c.count);
  if (fg.length > MULTICOLOR_MAX_COLORS) {
    const keep = fg.slice(0, MULTICOLOR_MAX_COLORS);
    const remap = new Map<number, number>();
    for (const { c, k } of fg.slice(MULTICOLOR_MAX_COLORS)) {
      let best = keep[0];
      for (const q of keep) if (dist2(q.c.lab, c.lab) < dist2(best.c.lab, c.lab)) best = q;
      remap.set(k, best.k);
    }
    for (let i = 0; i < n; i++) {
      const r = remap.get(label[i]);
      if (r !== undefined) label[i] = r;
    }
    fg = keep;
  }
  if (fg.length < 2) return null;

  // Obrysy každej farby: ostré pole príslušnosti → rozmazanie → obrys.
  // Susedné farby sa stretnú na tej istej hrane (polia sa dopĺňajú do 1).
  const widthMm = w * mmPerPx, heightMm = h * mmPerPx;
  const toMm = (loop: Point[]): Point[] => loop.map(([x, y]) => [x * mmPerPx, (h - y) * mmPerPx]);
  const layerFor = (k: number, background: boolean): ColorLayer | null => {
    const field = new Float32Array(n);
    let count = 0;
    for (let i = 0; i < n; i++) if (label[i] === k) { field[i] = 1; count++; }
    const loops = traceLoops(blurForTrace(field, w, h, scale), w, h, scale, mmPerPx).map(toMm);
    if (!loops.length) return null;
    const c = clusters[k];
    const hex = toHex(...c.rgb);
    return { hex, colorId: nearestPaletteColor(hex), share: count / n, loops, background };
  };
  const layers = fg.map(({ k }) => layerFor(k, false)).filter((l): l is ColorLayer => l !== null);
  if (layers.length < 2) return null;
  if (backgroundIdx >= 0) {
    const bg = layerFor(backgroundIdx, true);
    if (bg) layers.push(bg);
  }
  return { layers, widthMm, heightMm };
}

// --- SVG v prehliadači ------------------------------------------------------

function lengthToMm(value: string | null): number | null {
  if (!value) return null;
  const m = value.trim().match(/^([\d.]+)\s*(mm|cm|in|px|pt)?$/i);
  if (!m) return null;
  const v = Number(m[1]);
  if (!Number.isFinite(v) || v <= 0) return null;
  const unit = (m[2] || "px").toLowerCase();
  return unit === "mm" ? v : unit === "cm" ? v * 10 : unit === "in" ? v * 25.4 : unit === "pt" ? v * 0.352777778 : (v / 96) * 25.4;
}

/**
 * Rozmery SVG v mm — rovnako ako jednofarebný prevod na serveri
 * (app/api/svg-to-stl): fyzická šírka/výška, inak viewBox s dlhšou stranou 200 mm.
 */
export function svgSizeMm(svgText: string): { w: number; h: number } {
  const attr = (name: string) => svgText.match(new RegExp(`<svg[^>]*\\s${name}=["']([^"']+)["']`, "i"))?.[1] ?? null;
  const wMm = lengthToMm(attr("width"));
  const hMm = lengthToMm(attr("height"));
  const vb = attr("viewBox")?.trim().split(/[\s,]+/).map(Number);
  const vbW = vb && vb.length === 4 && vb[2] > 0 ? vb[2] : null;
  const vbH = vb && vb.length === 4 && vb[3] > 0 ? vb[3] : null;
  if (wMm && hMm) return { w: wMm, h: hMm };
  if (vbW && vbH) {
    if (wMm) return { w: wMm, h: (wMm * vbH) / vbW };
    if (hMm) return { w: (hMm * vbW) / vbH, h: hMm };
    const s = 200 / Math.max(vbW, vbH);
    return { w: vbW * s, h: vbH * s };
  }
  return { w: wMm ?? 100, h: hMm ?? 100 };
}

/** Vykreslí SVG do pixelov (biele pozadie nie — priehľadné ostane priehľadné). */
export async function loadSvgPixels(file: File, longestPx = 1600) {
  const text = await file.text();
  const size = svgSizeMm(text);
  const ratio = size.w / size.h;
  const w = Math.max(1, Math.round(ratio >= 1 ? longestPx : longestPx * ratio));
  const h = Math.max(1, Math.round(ratio >= 1 ? longestPx / ratio : longestPx));
  const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("SVG sa nepodarilo vykresliť."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Prehliadač nevie spracovať obrázok.");
    ctx.drawImage(img, 0, 0, w, h);
    return { w, h, scale: 1, mmPerPx: size.w / w, data: ctx.getImageData(0, 0, w, h).data };
  } finally {
    URL.revokeObjectURL(url);
  }
}
