/**
 * Prevod obrázka (PNG, JPG, WEBP) na SVG obrys v prehliadači — pre
 * „vytiahnutie do výšky“ rovnakou cestou ako SVG súbor (/api/svg-to-stl).
 *
 * Aby bol obrys hladký a čistý (nie schodíky po pixeloch):
 *  1. obrázok sa prevzorkuje na pracovné rozlíšenie (malé sa zväčšia),
 *  2. z priehľadnosti PNG alebo z jasu (prah Otsu) vznikne plynulé pole
 *     „pokrytia“ 0–1, ktoré sa jemne rozmaže (šum JPG, zubaté hrany),
 *  3. obrys sa nájde metódou marching squares s interpoláciou — body ležia
 *     presne na hrane s presnosťou na zlomok pixela,
 *  4. krivka sa vyhladí (ostré rohy ostávajú) a zjednoduší.
 * Najlepšie fungujú logá, nápisy a kresby s kontrastným pozadím; pri fotke
 * vznikne len silueta.
 */

export const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

export function isRasterImage(name: string): boolean {
  const lower = name.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

// Pracovné rozlíšenie (najdlhšia strana). Malé obrázky sa zväčšia — hrana
// sa potom vystopuje jemnejšie; väčšie by len spomalili prevod.
const TRACE_TARGET_PX = 1200;
const MAX_UPSCALE = 4;
// Najdlhšia strana výsledného modelu; zmeniť sa dá mierkou v konfigurátore.
const OUTPUT_LONGEST_MM = 100;
// Šírka prechodu jasu okolo prahu — z nej vznikne plynulá hrana.
const LUM_SOFTNESS = 28;
// Rozmazanie poľa pokrytia v pixeloch PÔVODNÉHO obrázka — zahladí šum JPG
// aj zubaté (nevyhladené) hrany, ostré rohy pritom ešte nezaguľatí.
const BLUR_SIGMA_SRC = 0.75;
// Krok rovnomerného prevzorkovania obrysu a počet vyhladzovacích prechodov.
const RESAMPLE_STEP = 1.0;
// Taubinovo vyhladenie (λ/μ) — hladí, ale tvar nezmenšuje.
const SMOOTH_PASSES = 40;
const TAUBIN_LAMBDA = 0.5;
const TAUBIN_MU = -0.53;
// Tolerancia zjednodušenia v pixeloch PÔVODNÉHO obrázka (~0,1 mm pri bežnom
// logu) — zahodí schodíky aj šum, rovná hrana ostane úplne rovná.
const FIT_EPS_SRC = 0.75;
// Cez zjednodušené body sa preloží hladká krivka (Catmull–Rom); dĺžka
// kúska krivky v pracovných pixeloch.
const CURVE_STEP = 2.5;
// Zlom väčší ako tento uhol je roh, ktorý sa nevyhladzuje. Meria sa na
// úseku ±CORNER_SPAN_SRC pixelov pôvodného obrázka — schodík po pixeloch
// sa tak za roh nepovažuje, cíp hviezdy či roh písmena áno.
const CORNER_DEG = 40;
const CORNER_SPAN_SRC = 3;

type Point = [number, number];

async function loadPixels(file: File) {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Obrázok sa nepodarilo načítať. Skúste PNG alebo JPG.");
  });
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(MAX_UPSCALE, TRACE_TARGET_PX / longest);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Prehliadač nevie spracovať obrázok.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return { w, h, scale, data: ctx.getImageData(0, 0, w, h).data };
}

/** Prah jasu metódou Otsu (najlepšie oddelí dve skupiny jasov). */
function otsu(lum: Float32Array): number {
  const hist = new Array(256).fill(0);
  for (const v of lum) hist[Math.max(0, Math.min(255, Math.round(v)))]++;
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
    const between = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2;
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

/** Pole pokrytia 0–1: 1 = súčasť modelu, 0.5 = presne na hrane. */
function coverageField(w: number, h: number, data: Uint8ClampedArray): Float32Array {
  const n = w * h;
  const cov = new Float32Array(n);

  // Priehľadné PNG: model je to, čo nie je priehľadné (alfa je hladká hrana).
  let transparent = 0;
  for (let i = 0; i < n; i++) if (data[i * 4 + 3] < 128) transparent++;
  if (transparent > n * 0.02 && transparent < n * 0.98) {
    for (let i = 0; i < n; i++) cov[i] = data[i * 4 + 3] / 255;
    return cov;
  }

  // Inak jas: priehľadné pixely berieme ako biele pozadie.
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = data[i * 4 + 3] / 255;
    const l = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    lum[i] = l * a + 255 * (1 - a);
  }
  const t = otsu(lum) + 0.5;
  for (let i = 0; i < n; i++) cov[i] = Math.min(1, Math.max(0, 0.5 + (t - lum[i]) / (2 * LUM_SOFTNESS)));

  // Pozadie je to, čo prevláda na okraji (tmavé logo na bielom aj svetlé
  // logo na tmavom).
  let edgeFg = 0, edgeAll = 0;
  const edge = (i: number) => {
    edgeFg += cov[i] >= 0.5 ? 1 : 0;
    edgeAll++;
  };
  for (let x = 0; x < w; x++) {
    edge(x);
    edge((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    edge(y * w);
    edge(y * w + w - 1);
  }
  if (edgeFg > edgeAll / 2) for (let i = 0; i < n; i++) cov[i] = 1 - cov[i];
  return cov;
}

/** Separabilné Gaussovo rozmazanie poľa. */
function blur(field: Float32Array, w: number, h: number, sigma: number): Float32Array {
  const r = Math.max(1, Math.ceil(sigma * 3));
  const kernel: number[] = [];
  let ksum = 0;
  for (let i = -r; i <= r; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel.push(v);
    ksum += v;
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= ksum;
  const tmp = new Float32Array(field.length);
  const out = new Float32Array(field.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) {
        const xx = Math.min(w - 1, Math.max(0, x + k));
        s += field[y * w + xx] * kernel[k + r];
      }
      tmp[y * w + x] = s;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) {
        const yy = Math.min(h - 1, Math.max(0, y + k));
        s += tmp[yy * w + x] * kernel[k + r];
      }
      out[y * w + x] = s;
    }
  }
  return out;
}

/**
 * Izočiary poľa na úrovni 0.5 (marching squares s lineárnou interpoláciou).
 * Pole je obložené nulami, takže všetky obrysy sú uzavreté.
 */
function marchingSquares(field: Float32Array, w: number, h: number): Point[][] {
  const W = w + 2, H = h + 2;
  const v = (x: number, y: number) => (x < 1 || y < 1 || x > w || y > h ? 0 : field[(y - 1) * w + (x - 1)]);
  const L = 0.5;
  const lerp = (a: number, b: number) => {
    const d = b - a;
    return Math.abs(d) < 1e-9 ? 0.5 : (L - a) / d;
  };
  // id hrany mriežky: vodorovná (x,y)-(x+1,y) = 2*(y*W+x), zvislá (x,y)-(x,y+1) = 2*(y*W+x)+1
  const hId = (x: number, y: number) => 2 * (y * W + x);
  const vId = (x: number, y: number) => 2 * (y * W + x) + 1;
  const points = new Map<number, Point>();
  const links = new Map<number, number[]>();
  const link = (a: number, b: number) => {
    (links.get(a) ?? links.set(a, []).get(a)!).push(b);
    (links.get(b) ?? links.set(b, []).get(b)!).push(a);
  };

  for (let y = 0; y < H - 1; y++) {
    for (let x = 0; x < W - 1; x++) {
      const a = v(x, y), b = v(x + 1, y), c = v(x + 1, y + 1), d = v(x, y + 1);
      const idx = (a >= L ? 8 : 0) | (b >= L ? 4 : 0) | (c >= L ? 2 : 0) | (d >= L ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const T = hId(x, y), R = vId(x + 1, y), B = hId(x, y + 1), Le = vId(x, y);
      const need = (id: number, p: () => Point) => {
        if (!points.has(id)) points.set(id, p());
      };
      const pT = () => [x + lerp(a, b), y] as Point;
      const pR = () => [x + 1, y + lerp(b, c)] as Point;
      const pB = () => [x + lerp(d, c), y + 1] as Point;
      const pL = () => [x, y + lerp(a, d)] as Point;
      const seg = (e1: number, p1: () => Point, e2: number, p2: () => Point) => {
        need(e1, p1);
        need(e2, p2);
        link(e1, e2);
      };
      const center = (a + b + c + d) / 4 >= L;
      switch (idx) {
        case 1: case 14: seg(Le, pL, B, pB); break;
        case 2: case 13: seg(B, pB, R, pR); break;
        case 3: case 12: seg(Le, pL, R, pR); break;
        case 4: case 11: seg(T, pT, R, pR); break;
        case 6: case 9: seg(T, pT, B, pB); break;
        case 7: case 8: seg(T, pT, Le, pL); break;
        case 5: // vnútri pravý horný a ľavý dolný roh
          if (center) { seg(T, pT, Le, pL); seg(B, pB, R, pR); }
          else { seg(T, pT, R, pR); seg(Le, pL, B, pB); }
          break;
        case 10: // vnútri ľavý horný a pravý dolný roh
          if (center) { seg(T, pT, R, pR); seg(Le, pL, B, pB); }
          else { seg(T, pT, Le, pL); seg(B, pB, R, pR); }
          break;
      }
    }
  }

  const visited = new Set<number>();
  const loops: Point[][] = [];
  for (const start of links.keys()) {
    if (visited.has(start)) continue;
    const loop: Point[] = [];
    let prev = -1;
    let cur = start;
    while (!visited.has(cur)) {
      visited.add(cur);
      const [px, py] = points.get(cur)!;
      loop.push([px - 0.5, py - 0.5]); // späť do súradníc pixelov (bez obloženia)
      const next = (links.get(cur) ?? []).find((n) => n !== prev && !visited.has(n));
      if (next === undefined) break;
      prev = cur;
      cur = next;
    }
    if (loop.length >= 3) loops.push(loop);
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

/** Rovnomerné prevzorkovanie uzavretej krivky (krok v pixeloch). */
function resample(loop: Point[], step: number): Point[] {
  const out: Point[] = [];
  let carry = 0;
  for (let i = 0; i < loop.length; i++) {
    const [x1, y1] = loop[i];
    const [x2, y2] = loop[(i + 1) % loop.length];
    const len = Math.hypot(x2 - x1, y2 - y1);
    let t = carry;
    while (t < len) {
      out.push([x1 + ((x2 - x1) * t) / len, y1 + ((y2 - y1) * t) / len]);
      t += step;
    }
    carry = t - len;
  }
  return out.length >= 3 ? out : loop;
}

/**
 * Vyhladenie krivky po celej dĺžke (Taubin: krok k priemeru susedov a malý
 * krok späť, aby sa tvar nezmenšoval), ktoré nechá skutočné rohy ostré.
 * Roh sa hľadá na širšom úseku krivky, takže drobné schodíky z pixelov sa
 * zahladia, ale cíp hviezdy ostane cípom.
 */
function smooth(loop: Point[], passes: number, scale: number): { pts: Point[]; corners: Uint8Array } {
  const n = loop.length;
  const span = Math.max(3, Math.round((CORNER_SPAN_SRC * scale) / RESAMPLE_STEP));
  if (n < 2 * span + 3) return { pts: loop, corners: new Uint8Array(n) };
  const cosCorner = Math.cos((CORNER_DEG * Math.PI) / 180);
  const fixed = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const p = loop[(i - span + n) % n], c = loop[i], q = loop[(i + span) % n];
    const ux = c[0] - p[0], uy = c[1] - p[1], vx = q[0] - c[0], vy = q[1] - c[1];
    const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
    if (lu && lv && (ux * vx + uy * vy) / (lu * lv) < cosCorner) fixed[i] = 1;
  }
  const step = (pts: Point[], k: number): Point[] => {
    const out: Point[] = new Array(n);
    for (let i = 0; i < n; i++) {
      const c = pts[i];
      if (fixed[i]) {
        out[i] = c;
        continue;
      }
      const p = pts[(i - 1 + n) % n], q = pts[(i + 1) % n];
      out[i] = [c[0] + k * ((p[0] + q[0]) / 2 - c[0]), c[1] + k * ((p[1] + q[1]) / 2 - c[1])];
    }
    return out;
  };
  let pts = loop;
  for (let pass = 0; pass < passes; pass++) pts = step(step(pts, TAUBIN_LAMBDA), TAUBIN_MU);
  // Z bodov jedného rohu (je ich viac vedľa seba) ostane ten najostrejší.
  const corners = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (!fixed[i]) continue;
    let j = i;
    while (fixed[(j + 1) % n] && (j + 1) % n !== i) j++;
    let best = i, bestCos = 2;
    for (let k = i; k <= j; k++) {
      const c = pts[k % n], p = pts[(k - span + n) % n], q = pts[(k + span) % n];
      const ux = c[0] - p[0], uy = c[1] - p[1], vx = q[0] - c[0], vy = q[1] - c[1];
      const cs = (ux * vx + uy * vy) / ((Math.hypot(ux, uy) * Math.hypot(vx, vy)) || 1);
      if (cs < bestCos) { bestCos = cs; best = k % n; }
    }
    corners[best] = 1;
    if (j < i) break; // obtočili sme sa okolo začiatku
    i = j;
  }
  return { pts, corners };
}

/**
 * Zjednodušenie, ktoré ponechá rohy: slučka sa rozdelí v rohoch a každý
 * úsek sa zjednoduší zvlášť. Vráti body aj to, ktoré z nich sú rohy.
 */
function simplifyKeepCorners(loop: Point[], corners: Uint8Array, eps: number): { pts: Point[]; corners: boolean[] } {
  const idx: number[] = [];
  for (let i = 0; i < loop.length; i++) if (corners[i]) idx.push(i);
  if (idx.length === 0) {
    const pts = simplify(loop, eps);
    return { pts, corners: pts.map(() => false) };
  }
  const pts: Point[] = [];
  const flags: boolean[] = [];
  for (let k = 0; k < idx.length; k++) {
    const a = idx[k], b = idx[(k + 1) % idx.length];
    const run: Point[] = [];
    for (let i = a; ; i = (i + 1) % loop.length) {
      run.push(loop[i]);
      if (i === b && run.length > 1) break;
      if (run.length > loop.length + 1) break;
    }
    const part = simplifyOpen(run, eps);
    for (let i = 0; i < part.length - 1; i++) {
      pts.push(part[i]);
      flags.push(i === 0);
    }
  }
  return { pts, corners: flags };
}

/** Douglas–Peucker pre otvorenú lomenú čiaru (koncové body ostávajú). */
function simplifyOpen(pts: Point[], eps: number): Point[] {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0];
  const [bx, by] = pts[pts.length - 1];
  const len = Math.hypot(bx - ax, by - ay);
  let maxD = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i];
    const d = len > 1e-9
      ? Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len
      : Math.hypot(px - ax, py - ay);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD <= eps) return [pts[0], pts[pts.length - 1]];
  return [...simplifyOpen(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplifyOpen(pts.slice(idx), eps)];
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

/**
 * Hladká krivka cez body (centripetálny Catmull–Rom). V rohoch (zistených
 * na jemnej krivke) vchádza krivka do bodu rovno a roh ostáva ostrý.
 */
function fitCurve(pts: Point[], corner: boolean[]): Point[] {
  const n = pts.length;
  if (n < 4) return pts;
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const p1 = pts[i], p2 = pts[(i + 1) % n];
    // Pri rohu sa „vonkajší“ susedný bod nahradí zrkadlením, aby sa
    // krivka za roh neohýbala.
    const p0 = corner[i] ? [2 * p1[0] - p2[0], 2 * p1[1] - p2[1]] as Point : pts[(i - 1 + n) % n];
    const p3 = corner[(i + 1) % n] ? [2 * p2[0] - p1[0], 2 * p2[1] - p1[1]] as Point : pts[(i + 2) % n];
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const steps = Math.max(1, Math.min(24, Math.round(len / CURVE_STEP)));
    // centripetálna parametrizácia — bez slučiek a prestrelov
    const t0 = 0;
    const t1 = t0 + Math.sqrt(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1e-6);
    const t2 = t1 + Math.sqrt(len || 1e-6);
    const t3 = t2 + Math.sqrt(Math.hypot(p3[0] - p2[0], p3[1] - p2[1]) || 1e-6);
    out.push(p1);
    for (let k = 1; k < steps; k++) {
      const t = t1 + ((t2 - t1) * k) / steps;
      const lerp = (a: Point, b: Point, ta: number, tb: number): Point => {
        const w = (t - ta) / (tb - ta);
        return [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w];
      };
      const a1 = lerp(p0, p1, t0, t1), a2 = lerp(p1, p2, t1, t2), a3 = lerp(p2, p3, t2, t3);
      const b1 = lerp(a1, a2, t0, t2), b2 = lerp(a2, a3, t1, t3);
      out.push(lerp(b1, b2, t1, t2));
    }
  }
  return out;
}

/** Z pixelov (RGBA) vytvorí SVG s vyplnenými tvarmi (evenodd); bez DOM — dá sa testovať. */
export function pixelsToSvg(w: number, h: number, data: Uint8ClampedArray, scale = 1): string {
  const field = blur(coverageField(w, h, data), w, h, Math.max(0.8, BLUR_SIGMA_SRC * scale));
  const minArea = Math.max(20, w * h * 0.0003); // drobné zrnká a šum preč
  // Tolerancia v pracovných pixeloch: ~0,75 px pôvodného obrázka, no nikdy
  // nie hrubšia ako ~0,12 mm (malé obrázky sú zväčšené, detail by sa stratil).
  const mmPerWorkPx = OUTPUT_LONGEST_MM / Math.max(w, h);
  const fitEps = Math.min(FIT_EPS_SRC * Math.max(1, scale), 0.12 / mmPerWorkPx);
  const loops = marchingSquares(field, w, h)
    .filter((l) => Math.abs(area(l)) >= minArea)
    .map((l) => {
      const smoothed = smooth(resample(l, RESAMPLE_STEP), SMOOTH_PASSES, scale);
      const s = simplifyKeepCorners(smoothed.pts, smoothed.corners, fitEps);
      return fitCurve(s.pts, s.corners);
    })
    .filter((l) => l.length >= 3);

  if (!loops.length) {
    throw new Error("V obrázku sa nenašiel žiadny tvar. Skúste logo alebo kresbu s kontrastným pozadím.");
  }

  const mmPerPx = OUTPUT_LONGEST_MM / Math.max(w, h);
  const fmt = (n: number) => (Math.round(n * 100) / 100).toString();
  const d = loops.map((l) => "M" + l.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join("L") + "Z").join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${(w * mmPerPx).toFixed(2)}mm" height="${(h * mmPerPx).toFixed(2)}mm" viewBox="0 0 ${w} ${h}">` +
    `<path fill="#000" fill-rule="evenodd" d="${d}"/></svg>`
  );
}

/** Prevedie obrázok na SVG súbor (vyplnené tvary, evenodd) pripravený na vytiahnutie. */
export async function rasterImageToSvgFile(file: File): Promise<File> {
  const { w, h, scale, data } = await loadPixels(file);
  const svg = pixelsToSvg(w, h, data, scale);
  const base = file.name.replace(/\.[^.]+$/, "") || "obrazok";
  return new File([svg], `${base}.svg`, { type: "image/svg+xml" });
}
