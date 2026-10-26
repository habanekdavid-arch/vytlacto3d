/**
 * Farebné vrstvy (lib/color-layers) → binárne STL, každá farba vytiahnutá
 * do vlastnej výšky. Vrstvy sa o GAP_MM zúžia, aby sa susedné farby
 * nedotýkali vrcholmi — v náhľade aj v slicere ostanú samostatnými dielmi.
 * Farby dielov sa vrátia v poradí lib/model-parts (rovnako ich rozdelí
 * 3D náhľad po načítaní súboru).
 */
import * as THREE from "three";
import type { ColorLayer } from "@/lib/color-layers";
import type { Point } from "@/lib/image-to-svg";
import { splitIntoParts } from "@/lib/model-parts";
import { MULTICOLOR_MAX_PARTS } from "@/lib/multicolor";

export type LayerSetting = { heightMm: number; colorId: string; enabled: boolean };

const GAP_MM = 0.03;

function signedArea(loop: Point[]) {
  let s = 0;
  for (let i = 0; i < loop.length; i++) {
    const [x1, y1] = loop[i];
    const [x2, y2] = loop[(i + 1) % loop.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

function contains(loop: Point[], [px, py]: Point) {
  let inside = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const [xi, yi] = loop[i], [xj, yj] = loop[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Posun slučky doľava o d (pri plnom materiáli vľavo = zúženie). */
function offsetLeft(loop: Point[], d: number): Point[] {
  const n = loop.length;
  return loop.map((p, i) => {
    const a = loop[(i - 1 + n) % n], b = loop[(i + 1) % n];
    let e1x = p[0] - a[0], e1y = p[1] - a[1], e2x = b[0] - p[0], e2y = b[1] - p[1];
    const l1 = Math.hypot(e1x, e1y) || 1, l2 = Math.hypot(e2x, e2y) || 1;
    e1x /= l1; e1y /= l1; e2x /= l2; e2y /= l2;
    let nx = -e1y - e2y, ny = e1x + e2x;
    const ln = Math.hypot(nx, ny);
    if (ln < 1e-9) return p;
    nx /= ln; ny /= ln;
    const miter = d / Math.max(0.35, nx * -e1y + ny * e1x);
    return [p[0] + nx * miter, p[1] + ny * miter];
  });
}

/** Slučky jednej farby → tvary s dierami (podľa vnorenia). */
function loopsToShapes(loops: Point[][]): THREE.Shape[] {
  const items = loops.map((loop) => ({ loop, area: Math.abs(signedArea(loop)), parent: -1, depth: 0 }));
  items.forEach((it, i) => {
    let parent = -1;
    items.forEach((other, j) => {
      if (i === j || other.area <= it.area || !contains(other.loop, it.loop[0])) return;
      it.depth++;
      if (parent < 0 || other.area < items[parent].area) parent = j;
    });
    it.parent = parent;
  });
  const shapes = new Map<number, THREE.Shape>();
  const oriented = (loop: Point[], ccw: boolean) => {
    // plný materiál vždy vľavo: obrys proti smeru hodín, diera v smere
    const pts = signedArea(loop) > 0 === ccw ? loop : [...loop].reverse();
    return offsetLeft(pts, GAP_MM).map(([x, y]) => new THREE.Vector2(x, y));
  };
  items.forEach((it, i) => {
    if (it.depth % 2 === 0) shapes.set(i, new THREE.Shape(oriented(it.loop, true)));
  });
  items.forEach((it) => {
    if (it.depth % 2 === 1 && shapes.has(it.parent)) shapes.get(it.parent)!.holes.push(new THREE.Path(oriented(it.loop, false)));
  });
  return [...shapes.values()];
}

export type LayeredModel = {
  file: File;
  /** Farby dielov v poradí lib/model-parts, alebo null (jedna farba / priveľa dielov). */
  partColors: string[] | null;
  /** Dielov je viac, ako vie 3D náhľad zafarbiť. */
  tooManyParts: boolean;
};

export function buildLayeredStl(layers: ColorLayer[], settings: LayerSetting[], name: string): LayeredModel {
  const chunks: { positions: Float32Array; layer: number }[] = [];
  layers.forEach((layer, li) => {
    const s = settings[li];
    if (!s?.enabled || !(s.heightMm > 0)) return;
    const shapes = loopsToShapes(layer.loops);
    if (!shapes.length) return;
    const g = new THREE.ExtrudeGeometry(shapes, { depth: s.heightMm, bevelEnabled: false, curveSegments: 1, steps: 1 });
    const flat = g.index ? g.toNonIndexed() : g;
    chunks.push({ positions: new Float32Array(flat.getAttribute("position").array as ArrayLike<number>), layer: li });
    g.dispose();
    if (flat !== g) flat.dispose();
  });
  const total = chunks.reduce((s, c) => s + c.positions.length, 0);
  if (!total) throw new Error("Žiadna farba nemá výšku — nastavte aspoň jednej farbe výšku.");

  // Model do kladných súradníc (ako jednofarebný prevod)
  const all = new Float32Array(total);
  let o = 0;
  for (const c of chunks) { all.set(c.positions, o); o += c.positions.length; }
  let minX = Infinity, minY = Infinity;
  for (let i = 0; i < all.length; i += 3) { minX = Math.min(minX, all[i]); minY = Math.min(minY, all[i + 1]); }
  for (let i = 0; i < all.length; i += 3) { all[i] -= minX; all[i + 1] -= minY; }

  // Binárne STL
  const tris = all.length / 9;
  const buf = new ArrayBuffer(84 + tris * 50);
  const view = new DataView(buf);
  const header = "vytlacto3d multicolor layers";
  for (let i = 0; i < header.length; i++) view.setUint8(i, header.charCodeAt(i));
  view.setUint32(80, tris, true);
  for (let t = 0; t < tris; t++) {
    const p = t * 9, off = 84 + t * 50;
    const ux = all[p + 3] - all[p], uy = all[p + 4] - all[p + 1], uz = all[p + 5] - all[p + 2];
    const vx = all[p + 6] - all[p], vy = all[p + 7] - all[p + 1], vz = all[p + 8] - all[p + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    view.setFloat32(off, nx, true);
    view.setFloat32(off + 4, ny, true);
    view.setFloat32(off + 8, nz, true);
    for (let k = 0; k < 9; k++) view.setFloat32(off + 12 + k * 4, all[p + k], true);
  }
  const file = new File([buf], name.replace(/\.[^.]+$/, "") + ".stl", { type: "model/stl" });

  // Farby dielov: rovnaké rozdelenie ako v 3D náhľade, diel → vrstva podľa vrcholov
  const used = new Set(chunks.map((c) => settings[c.layer].colorId));
  if (used.size < 2) return { file, partColors: null, tooManyParts: false };
  const keyOf = (x: number, y: number, z: number) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;
  const layerOfVertex = new Map<string, number>();
  o = 0;
  for (const c of chunks) {
    for (let i = 0; i < c.positions.length; i += 3) layerOfVertex.set(keyOf(all[o + i], all[o + i + 1], all[o + i + 2]), c.layer);
    o += c.positions.length;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(all, 3));
  const parts = splitIntoParts(geometry, MULTICOLOR_MAX_PARTS);
  geometry.dispose();
  if (!parts) return { file, partColors: null, tooManyParts: true };
  const partColors = parts.map((part) => {
    const pos = part.geometry.getAttribute("position");
    const votes = new Map<number, number>();
    for (let i = 0; i < pos.count; i += Math.max(1, Math.floor(pos.count / 60))) {
      const l = layerOfVertex.get(keyOf(pos.getX(i), pos.getY(i), pos.getZ(i)));
      if (l !== undefined) votes.set(l, (votes.get(l) ?? 0) + 1);
    }
    part.geometry.dispose();
    const layer = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? chunks[0].layer;
    return settings[layer].colorId;
  });
  return { file, partColors, tooManyParts: false };
}
