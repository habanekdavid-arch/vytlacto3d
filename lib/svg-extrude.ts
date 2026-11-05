import fs from "node:fs/promises";
import path from "node:path";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

/**
 * Jednofarebné SVG → vodotesný 3D model (vektorovo, bez rastra).
 *
 * - Výplne podľa fill-rule (evenodd / nonzero) vrátane dier.
 * - Čiary (stroke) ako skutočné čiary s hrúbkou stroke-width, nie ako
 *   vyplnená plocha medzi koncami krivky.
 * - Krivky sa delia podľa dĺžky (~0,08 mm), takže aj malé oblúčiky a
 *   krúžky ostanú okrúhle a veľké krivky nemajú hrany.
 * - Biela výplň nakreslená cez tmavý tvar ho vyreže (tak, ako to vyzerá).
 * - Všetko sa zjednotí (manifold-3d) — prekrývajúce sa tvary dajú jeden
 *   čistý model bez vnútorných stien.
 */

type Wasm = Awaited<ReturnType<typeof import("manifold-3d/manifold").default>>;
type Pt = [number, number];

let wasmReady: Promise<Wasm> | null = null;

function loadManifold(): Promise<Wasm> {
  wasmReady ??= (async () => {
    const Module = (await import("manifold-3d/manifold")).default;
    const wasmBinary = await fs.readFile(path.join(process.cwd(), "node_modules/manifold-3d/manifold.wasm"));
    const w = await Module({ wasmBinary } as unknown as Parameters<typeof Module>[0]);
    w.setup();
    return w;
  })().catch((e) => {
    wasmReady = null;
    throw e;
  });
  return wasmReady;
}

/** Krok delenia kriviek v mm a limity počtu bodov na jednu krivku. */
const STEP_MM = 0.08;
const MIN_DIV = 6;
const MAX_DIV = 400;

export class SvgExtrudeError extends Error {}

type Style = {
  fill?: string;
  fillOpacity?: number;
  fillRule?: string;
  opacity?: number;
  stroke?: string;
  strokeOpacity?: number;
  strokeWidth?: number;
  visibility?: string;
};

const isNone = (c: string | undefined) => !c || c === "none" || c === "transparent";

/** Svetlá farba (biela) — v SVG zvyčajne „vyrezáva“ tvar pod ňou. */
function isWhite(color: string | undefined): boolean {
  if (!color || color.startsWith("url(")) return false;
  try {
    const c = new THREE.Color().setStyle(color, THREE.LinearSRGBColorSpace);
    return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b > 0.92;
  } catch {
    return false;
  }
}

/** Body krivky (podcesty) v mm, Y nahor; delenie podľa dĺžky každej časti. */
function samplePath(sub: THREE.Path, toMm: number): Pt[] {
  const out: Pt[] = [];
  const push = (v: THREE.Vector2) => {
    const p: Pt = [v.x * toMm, -v.y * toMm];
    const last = out[out.length - 1];
    if (!last || Math.abs(last[0] - p[0]) > 1e-6 || Math.abs(last[1] - p[1]) > 1e-6) out.push(p);
  };
  for (const curve of sub.curves) {
    if ((curve as THREE.LineCurve).isLineCurve) {
      const c = curve as THREE.LineCurve;
      push(c.v1);
      push(c.v2);
      continue;
    }
    const len = curve.getLength() * toMm;
    const div = Math.max(MIN_DIV, Math.min(MAX_DIV, Math.ceil(len / STEP_MM)));
    for (const v of curve.getPoints(div) as THREE.Vector2[]) push(v);
  }
  return out;
}

function isClosed(sub: THREE.Path, pts: Pt[]): boolean {
  if ((sub as THREE.Path & { autoClose?: boolean }).autoClose) return true;
  if (pts.length < 3) return false;
  const a = pts[0], b = pts[pts.length - 1];
  return Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-4;
}

/** Trojuholníky čiary (SVGLoader) ako kladne orientované obrysy. */
function strokeContours(pts: Pt[], closed: boolean, style: Style, widthMm: number): Pt[][] {
  const vecs = pts.map(([x, y]) => new THREE.Vector2(x, y));
  if (closed && vecs.length > 2) {
    const a = vecs[0], b = vecs[vecs.length - 1];
    if (a.distanceTo(b) > 1e-6) vecs.push(a.clone());
  }
  if (vecs.length < 2) return [];
  const strokeStyle = SVGLoader.getStrokeStyle(
    widthMm,
    "#000",
    (style as any).strokeLineJoin ?? "miter",
    (style as any).strokeLineCap ?? "butt",
    (style as any).strokeMiterLimit ?? 4
  );
  const geo = SVGLoader.pointsToStroke(vecs, strokeStyle, 16, 1e-5);
  if (!geo) return [];
  const pos = geo.getAttribute("position");
  const tris: Pt[][] = [];
  for (let i = 0; i + 2 < pos.count; i += 3) {
    const a: Pt = [pos.getX(i), pos.getY(i)];
    const b: Pt = [pos.getX(i + 1), pos.getY(i + 1)];
    const c: Pt = [pos.getX(i + 2), pos.getY(i + 2)];
    const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (Math.abs(cross) < 1e-9) continue;
    tris.push(cross > 0 ? [a, b, c] : [a, c, b]);
  }
  geo.dispose();
  return tris;
}

function meshToStl(verts: Float32Array, tris: Uint32Array, numProp: number): Buffer {
  const count = tris.length / 3;
  const buf = Buffer.alloc(84 + count * 50);
  buf.write("vytlacto3d svg model", 0, "ascii");
  buf.writeUInt32LE(count, 80);
  for (let t = 0; t < count; t++) {
    const off = 84 + t * 50;
    const v = [0, 1, 2].map((k) => {
      const i = tris[t * 3 + k] * numProp;
      return [verts[i], verts[i + 1], verts[i + 2]];
    });
    const ux = v[1][0] - v[0][0], uy = v[1][1] - v[0][1], uz = v[1][2] - v[0][2];
    const wx = v[2][0] - v[0][0], wy = v[2][1] - v[0][1], wz = v[2][2] - v[0][2];
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    buf.writeFloatLE(nx, off);
    buf.writeFloatLE(ny, off + 4);
    buf.writeFloatLE(nz, off + 8);
    for (let k = 0; k < 3; k++) for (let c = 0; c < 3; c++) buf.writeFloatLE(v[k][c], off + 12 + (k * 3 + c) * 4);
  }
  return buf;
}

export type SvgExtrudeResult = { stl: Buffer; shapes: number; dims: { x: number; y: number; z: number } };

/**
 * @param svgText obsah SVG
 * @param toMm    prepočet používateľských jednotiek SVG na mm
 * @param thicknessMm výška vytiahnutia
 */
export async function extrudeSvg(svgText: string, toMm: number, thicknessMm: number): Promise<SvgExtrudeResult> {
  const data = new SVGLoader().parse(svgText);

  type Paint = { contours: Pt[][]; rule: "EvenOdd" | "NonZero" | "Positive"; white: boolean };
  const paints: Paint[] = [];

  for (const p of data.paths) {
    const style = ((p.userData as any)?.style ?? {}) as Style;
    if (style.visibility === "hidden") continue;
    const opacity = style.opacity ?? 1;
    const subs = p.subPaths.map((sub) => ({ sub, pts: samplePath(sub, toMm) }));

    const fillVisible = !isNone(style.fill) && (style.fillOpacity ?? 1) * opacity > 0.05;
    if (fillVisible) {
      const contours = subs.map((s) => s.pts).filter((pts) => pts.length >= 3);
      if (contours.length) {
        paints.push({
          contours,
          rule: style.fillRule === "evenodd" ? "EvenOdd" : "NonZero",
          white: isWhite(style.fill),
        });
      }
    }

    const widthMm = (style.strokeWidth ?? 1) * toMm;
    const strokeVisible = !isNone(style.stroke) && widthMm > 0.01 && (style.strokeOpacity ?? 1) * opacity > 0.05;
    if (strokeVisible) {
      const contours = subs.flatMap((s) => strokeContours(s.pts, isClosed(s.sub, s.pts), style, widthMm));
      if (contours.length) paints.push({ contours, rule: "Positive", white: isWhite(style.stroke) });
    }
  }

  if (!paints.length) throw new SvgExtrudeError("SVG neobsahuje žiadne tvary.");
  // Celé biele logo (na priehľadnom pozadí) sa tlačí — vyrezáva len biela cez tmavé.
  const allWhite = paints.every((p) => p.white);

  const m = await loadManifold();
  const garbage: { delete(): void }[] = [];
  const keep = <T extends { delete(): void }>(o: T) => (garbage.push(o), o);
  try {
    let acc: InstanceType<Wasm["CrossSection"]> | null = null;
    for (const paint of paints) {
      const cs = keep(new m.CrossSection(paint.contours, paint.rule));
      if (paint.white && !allWhite) {
        if (acc) acc = keep(acc.subtract(cs));
      } else {
        acc = acc ? keep(acc.add(cs)) : cs;
      }
    }
    if (!acc || acc.isEmpty()) throw new SvgExtrudeError("SVG neobsahuje žiadne tvary.");
    const clean = keep(acc.simplify(0.002));
    const shapes = clean.numContour();
    const solid = keep(clean.extrude(thicknessMm));
    const box = solid.boundingBox();
    const placed = keep(solid.translate([-box.min[0], -box.min[1], -box.min[2]]));
    const mesh = placed.getMesh();
    if (!mesh.triVerts.length) throw new SvgExtrudeError("SVG neobsahuje žiadne tvary.");
    return {
      stl: meshToStl(mesh.vertProperties, mesh.triVerts, mesh.numProp),
      shapes,
      dims: { x: box.max[0] - box.min[0], y: box.max[1] - box.min[1], z: box.max[2] - box.min[2] },
    };
  } finally {
    for (const o of garbage) {
      try {
        o.delete();
      } catch {}
    }
  }
}
