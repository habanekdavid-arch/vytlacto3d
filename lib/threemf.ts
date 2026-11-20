import { unzipSync, strFromU8 } from "three/examples/jsm/libs/fflate.module.js";

/**
 * 3MF → binárne STL (v prehliadači). 3MF je ZIP s XML modelmi; po prevode
 * ide súbor rovnakou cestou ako STL (analýza, cena, náhľad, objednávka) a
 * pôvodný .3mf sa uloží ako podklad k objednávke.
 *
 * Podporuje: viac súborov modelov (Bambu Studio, PrusaSlicer — production
 * extension p:path), zložené objekty (components), transformácie položiek aj
 * komponentov a jednotky modelu. Podpery (type="support") sa vynechajú.
 */

type Mat = number[]; // 3MF 3×4 matica v poradí m00 m01 m02 m10 m11 m12 m20 m21 m22 m30 m31 m32
type MeshObj = { kind: "mesh"; vertices: Float64Array; triangles: Uint32Array };
type CompObj = { kind: "components"; items: { objectId: string; path: string; transform: Mat }[] };
type Obj = (MeshObj | CompObj) & { type: string };

const IDENTITY: Mat = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
const UNIT_MM: Record<string, number> = {
  micron: 0.001,
  millimeter: 1,
  centimeter: 10,
  inch: 25.4,
  foot: 304.8,
  meter: 1000,
};
const MAX_TRIANGLES = 6_000_000;

export class ThreeMfError extends Error {}

function parseTransform(value: string | null): Mat {
  if (!value) return IDENTITY;
  const n = value.trim().split(/\s+/).map(Number);
  return n.length === 12 && n.every(Number.isFinite) ? n : IDENTITY;
}

/** Riadkový vektor: p' = p · A · B  →  výsledná matica A·B. */
function multiply(a: Mat, b: Mat): Mat {
  const A = [
    [a[0], a[1], a[2], 0],
    [a[3], a[4], a[5], 0],
    [a[6], a[7], a[8], 0],
    [a[9], a[10], a[11], 1],
  ];
  const B = [
    [b[0], b[1], b[2], 0],
    [b[3], b[4], b[5], 0],
    [b[6], b[7], b[8], 0],
    [b[9], b[10], b[11], 1],
  ];
  const C = A.map((row) => [0, 1, 2, 3].map((j) => row.reduce((s, v, k) => s + v * B[k][j], 0)));
  return [C[0][0], C[0][1], C[0][2], C[1][0], C[1][1], C[1][2], C[2][0], C[2][1], C[2][2], C[3][0], C[3][1], C[3][2]];
}

function byLocalName(el: Element | Document, name: string): Element[] {
  return Array.from(el.getElementsByTagName("*")).filter((e) => e.localName === name);
}

function attrAny(el: Element, local: string): string | null {
  for (const a of Array.from(el.attributes)) if (a.localName === local) return a.value;
  return null;
}

function normPath(p: string): string {
  return p.replace(/^\/+/, "");
}

function parseModel(xml: string) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new ThreeMfError("Súbor 3MF je poškodený (neplatný model).");
  const model = byLocalName(doc, "model")[0];
  const unit = model?.getAttribute("unit") || "millimeter";
  const objects = new Map<string, Obj>();
  for (const o of byLocalName(doc, "object")) {
    const id = o.getAttribute("id");
    if (!id) continue;
    const type = (o.getAttribute("type") || "model").toLowerCase();
    const mesh = byLocalName(o, "mesh")[0];
    if (mesh) {
      const vs = byLocalName(mesh, "vertex");
      const vertices = new Float64Array(vs.length * 3);
      vs.forEach((v, i) => {
        vertices[i * 3] = Number(v.getAttribute("x"));
        vertices[i * 3 + 1] = Number(v.getAttribute("y"));
        vertices[i * 3 + 2] = Number(v.getAttribute("z"));
      });
      const ts = byLocalName(mesh, "triangle");
      const triangles = new Uint32Array(ts.length * 3);
      ts.forEach((t, i) => {
        triangles[i * 3] = Number(t.getAttribute("v1"));
        triangles[i * 3 + 1] = Number(t.getAttribute("v2"));
        triangles[i * 3 + 2] = Number(t.getAttribute("v3"));
      });
      objects.set(id, { kind: "mesh", vertices, triangles, type });
      continue;
    }
    const comps = byLocalName(o, "component");
    if (comps.length) {
      objects.set(id, {
        kind: "components",
        type,
        items: comps.map((c) => ({
          objectId: c.getAttribute("objectid") ?? "",
          path: normPath(attrAny(c, "path") ?? ""),
          transform: parseTransform(c.getAttribute("transform")),
        })),
      });
    }
  }
  const build = byLocalName(doc, "item").map((it) => ({
    objectId: it.getAttribute("objectid") ?? "",
    path: normPath(attrAny(it, "path") ?? ""),
    transform: parseTransform(it.getAttribute("transform")),
  }));
  return { unit, objects, build };
}

/** Prevedie .3mf na binárne STL (v mm). */
export async function convert3mfToStl(file: File): Promise<File> {
  let zip: Record<string, Uint8Array>;
  try {
    zip = unzipSync(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw new ThreeMfError("Súbor 3MF sa nepodarilo otvoriť (nie je to platný 3MF).");
  }
  const names = Object.keys(zip);
  const find = (p: string) => names.find((n) => n.toLowerCase() === p.toLowerCase());

  // Hlavný model podľa _rels/.rels, inak 3D/3dmodel.model alebo prvý .model.
  let root = "";
  const relsName = find("_rels/.rels");
  if (relsName) {
    const m = strFromU8(zip[relsName]).match(/Target="([^"]+\.model)"/i);
    if (m) root = find(normPath(m[1])) ?? "";
  }
  root ||= find("3D/3dmodel.model") ?? names.find((n) => /\.model$/i.test(n)) ?? "";
  if (!root) throw new ThreeMfError("V súbore 3MF sa nenašiel žiadny model.");

  const cache = new Map<string, ReturnType<typeof parseModel>>();
  const load = (path: string) => {
    const name = find(path);
    if (!name) throw new ThreeMfError(`V súbore 3MF chýba časť ${path}.`);
    if (!cache.has(name)) cache.set(name, parseModel(strFromU8(zip[name])));
    return cache.get(name)!;
  };
  const rootModel = load(root);
  const scale = UNIT_MM[rootModel.unit] ?? 1;

  // Po kúskoch (Float32Array), nie jedno obrovské pole čísel — šetrí pamäť.
  const chunks: Float32Array[] = [];
  let triCount = 0;
  const emit = (path: string, objectId: string, m: Mat, depth: number) => {
    if (depth > 16) throw new ThreeMfError("Súbor 3MF má príliš hlboko vnorené objekty.");
    const model = load(path);
    const obj = model.objects.get(objectId);
    if (!obj || obj.type === "support" || obj.type === "solidsupport") return;
    if (obj.kind === "components") {
      for (const c of obj.items) emit(c.path || path, c.objectId, multiply(c.transform, m), depth + 1);
      return;
    }
    const v = obj.vertices;
    const tr = obj.triangles;
    triCount += tr.length / 3;
    if (triCount > MAX_TRIANGLES) throw new ThreeMfError("Model v 3MF je príliš veľký (priveľa trojuholníkov).");
    const chunk = new Float32Array(tr.length * 3);
    for (let i = 0; i < tr.length; i++) {
      const k = tr[i] * 3;
      if (k + 2 >= v.length) throw new ThreeMfError("Súbor 3MF je poškodený (neplatný trojuholník).");
      const x = v[k], y = v[k + 1], z = v[k + 2];
      chunk[i * 3] = (x * m[0] + y * m[3] + z * m[6] + m[9]) * scale;
      chunk[i * 3 + 1] = (x * m[1] + y * m[4] + z * m[7] + m[10]) * scale;
      chunk[i * 3 + 2] = (x * m[2] + y * m[5] + z * m[8] + m[11]) * scale;
    }
    chunks.push(chunk);
  };

  if (rootModel.build.length) {
    for (const it of rootModel.build) emit(it.path || root, it.objectId, it.transform, 0);
  } else {
    for (const id of rootModel.objects.keys()) emit(root, id, IDENTITY, 0);
  }
  if (!triCount) throw new ThreeMfError("V súbore 3MF sa nenašiel žiadny tvar na tlač.");
  const out = new Float32Array(triCount * 9);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }

  // Binárne STL; normály dopočíta analýza aj náhľad.
  const n = out.length / 9;
  const buf = new ArrayBuffer(84 + n * 50);
  const dv = new DataView(buf);
  const header = "vytlacto3d 3mf";
  for (let i = 0; i < header.length; i++) dv.setUint8(i, header.charCodeAt(i));
  dv.setUint32(80, n, true);
  for (let t = 0; t < n; t++) {
    const off = 84 + t * 50;
    const p = t * 9;
    const ux = out[p + 3] - out[p], uy = out[p + 4] - out[p + 1], uz = out[p + 5] - out[p + 2];
    const wx = out[p + 6] - out[p], wy = out[p + 7] - out[p + 1], wz = out[p + 8] - out[p + 2];
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    dv.setFloat32(off, nx, true);
    dv.setFloat32(off + 4, ny, true);
    dv.setFloat32(off + 8, nz, true);
    for (let k = 0; k < 9; k++) dv.setFloat32(off + 12 + k * 4, out[p + k], true);
  }
  const base = file.name.replace(/\.3mf$/i, "") || "model";
  return new File([buf], `${base}.stl`, { type: "model/stl" });
}
