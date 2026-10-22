/**
 * Prevod obrázka (PNG, JPG, WEBP) na SVG obrys v prehliadači — pre
 * „vytiahnutie do výšky“ rovnakou cestou ako SVG súbor (/api/svg-to-stl).
 *
 * Postup: obrázok sa zmenší, oddelí sa popredie od pozadia (priehľadnosť
 * PNG, inak prah jasu podľa Otsu), obrys popredia sa vystopuje po hranách
 * pixelov a zjednoduší. Najlepšie fungujú logá, nápisy a kresby
 * s kontrastným pozadím; pri fotke vznikne len silueta.
 */

export const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

export function isRasterImage(name: string): boolean {
  const lower = name.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

// Najdlhšia strana pri stopovaní — viac je pomalé a obrys zbytočne zubatý.
const TRACE_MAX_PX = 700;
// Najdlhšia strana výsledného modelu; zmeniť sa dá mierkou v konfigurátore.
const OUTPUT_LONGEST_MM = 100;

type Point = [number, number];

async function loadPixels(file: File) {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Obrázok sa nepodarilo načítať. Skúste PNG alebo JPG.");
  });
  const scale = Math.min(1, TRACE_MAX_PX / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Prehliadač nevie spracovať obrázok.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return { w, h, data: ctx.getImageData(0, 0, w, h).data };
}

/** Prah jasu metódou Otsu (najlepšie oddelí dve skupiny jasov). */
function otsu(lum: Uint8Array): number {
  const hist = new Array(256).fill(0);
  for (const v of lum) hist[v]++;
  const total = lum.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

/** Maska popredia: 1 = súčasť modelu. */
function buildMask(w: number, h: number, data: Uint8ClampedArray): Uint8Array {
  const n = w * h;
  const mask = new Uint8Array(n);

  // Priehľadné PNG: model je to, čo nie je priehľadné.
  let transparent = 0;
  for (let i = 0; i < n; i++) if (data[i * 4 + 3] < 128) transparent++;
  if (transparent > n * 0.02 && transparent < n * 0.98) {
    for (let i = 0; i < n; i++) mask[i] = data[i * 4 + 3] >= 128 ? 1 : 0;
    return mask;
  }

  // Inak jas: priehľadné pixely berieme ako biele pozadie.
  const lum = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const a = data[i * 4 + 3] / 255;
    const l = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    lum[i] = Math.round(l * a + 255 * (1 - a));
  }
  const t = otsu(lum);
  for (let i = 0; i < n; i++) mask[i] = lum[i] <= t ? 1 : 0;

  // Pozadie je to, čo prevláda na okraji obrázka (tmavé logo na bielom
  // aj biele logo na tmavom).
  let edgeFg = 0, edgeAll = 0;
  for (let x = 0; x < w; x++) {
    edgeFg += mask[x] + mask[(h - 1) * w + x];
    edgeAll += 2;
  }
  for (let y = 0; y < h; y++) {
    edgeFg += mask[y * w] + mask[y * w + w - 1];
    edgeAll += 2;
  }
  if (edgeFg > edgeAll / 2) for (let i = 0; i < n; i++) mask[i] ^= 1;
  return mask;
}

/**
 * Obrysy popredia po hranách pixelov. Každá hrana má popredie po pravej
 * strane, takže vonkajšie obrysy a diery majú opačný smer (pre evenodd
 * na tom nezáleží, ale slučky sú vždy uzavreté).
 */
function traceContours(w: number, h: number, mask: Uint8Array): Point[][] {
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < w && y < h ? mask[y * w + x] : 0);
  const key = (x: number, y: number) => y * (w + 1) + x;
  const out = new Map<number, number[]>(); // vrchol → indexy hrán, ktoré z neho vychádzajú
  const edges: [number, number, number, number][] = [];
  const add = (x1: number, y1: number, x2: number, y2: number) => {
    const k = key(x1, y1);
    const list = out.get(k);
    if (list) list.push(edges.length);
    else out.set(k, [edges.length]);
    edges.push([x1, y1, x2, y2]);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      if (!at(x, y - 1)) add(x, y, x + 1, y);
      if (!at(x + 1, y)) add(x + 1, y, x + 1, y + 1);
      if (!at(x, y + 1)) add(x + 1, y + 1, x, y + 1);
      if (!at(x - 1, y)) add(x, y + 1, x, y);
    }
  }

  const used = new Uint8Array(edges.length);
  const loops: Point[][] = [];
  for (let start = 0; start < edges.length; start++) {
    if (used[start]) continue;
    const loop: Point[] = [];
    let e = start;
    while (!used[e]) {
      used[e] = 1;
      const [x1, y1, x2, y2] = edges[e];
      loop.push([x1, y1]);
      const next = (out.get(key(x2, y2)) ?? []).filter((i) => !used[i]);
      if (!next.length) break;
      if (next.length === 1) {
        e = next[0];
        continue;
      }
      // Pixely dotýkajúce sa len rohom: zabočíme doprava, nech sa obrysy
      // nekrížia.
      const dx = x2 - x1, dy = y2 - y1;
      e = next.find((i) => {
        const [a, b, c, d] = edges[i];
        return c - a === -dy && d - b === dx;
      }) ?? next[0];
    }
    if (loop.length >= 4) loops.push(loop);
  }
  return loops;
}

function area(loop: Point[]): number {
  let s = 0;
  for (let i = 0; i < loop.length; i++) {
    const [x1, y1] = loop[i];
    const [x2, y2] = loop[(i + 1) % loop.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

/** Douglas–Peucker pre uzavretú slučku. */
function simplify(loop: Point[], eps: number): Point[] {
  if (loop.length < 8) return loop;
  const dp = (pts: Point[]): Point[] => {
    if (pts.length < 3) return pts;
    const [ax, ay] = pts[0];
    const [bx, by] = pts[pts.length - 1];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let maxD = 0, idx = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const [px, py] = pts[i];
      const d = Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD <= eps) return [pts[0], pts[pts.length - 1]];
    return [...dp(pts.slice(0, idx + 1)).slice(0, -1), ...dp(pts.slice(idx))];
  };
  // Rozdelíme v najvzdialenejšom bode od začiatku, aby slučka ostala uzavretá.
  let far = 0, farD = 0;
  for (let i = 1; i < loop.length; i++) {
    const d = Math.hypot(loop[i][0] - loop[0][0], loop[i][1] - loop[0][1]);
    if (d > farD) {
      farD = d;
      far = i;
    }
  }
  const a = dp(loop.slice(0, far + 1));
  const b = dp([...loop.slice(far), loop[0]]);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

/** Prevedie obrázok na SVG súbor (vyplnené tvary, evenodd) pripravený na vytiahnutie. */
export async function rasterImageToSvgFile(file: File): Promise<File> {
  const { w, h, data } = await loadPixels(file);
  const mask = buildMask(w, h, data);

  const minArea = Math.max(12, w * h * 0.0004); // drobné zrnká a šum preč
  const loops = traceContours(w, h, mask)
    .filter((l) => Math.abs(area(l)) >= minArea)
    .map((l) => simplify(l, 0.9))
    .filter((l) => l.length >= 3);

  if (!loops.length) {
    throw new Error("V obrázku sa nenašiel žiadny tvar. Skúste logo alebo kresbu s kontrastným pozadím.");
  }

  const mmPerPx = OUTPUT_LONGEST_MM / Math.max(w, h);
  const d = loops
    .map((l) => "M" + l.map(([x, y]) => `${x} ${y}`).join("L") + "Z")
    .join("");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${(w * mmPerPx).toFixed(2)}mm" height="${(h * mmPerPx).toFixed(2)}mm" viewBox="0 0 ${w} ${h}">` +
    `<path fill="#000" fill-rule="evenodd" d="${d}"/></svg>`;

  const base = file.name.replace(/\.[^.]+$/, "") || "obrazok";
  return new File([svg], `${base}.svg`, { type: "image/svg+xml" });
}
