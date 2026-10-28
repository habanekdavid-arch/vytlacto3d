/**
 * Popis súčiastky z výkresu ako postupnosť telies (CSG) a jeho prevod na STL.
 * AI vráti zoznam krokov — pridaj / odober / prienik telesa — v milimetroch;
 * tu sa z nich manifold-3d poskladá vodotesný model na tlač.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const P2 = z.object({ x: z.number(), y: z.number() });
const V3 = z.object({ x: z.number(), y: z.number(), z: z.number() });

const Shape = z.union([
  z
    .object({ type: z.enum(["box"]), sizeX: z.number(), sizeY: z.number(), sizeZ: z.number() })
    .describe("Box. Local origin is its corner; it extends towards +X, +Y, +Z."),
  z
    .object({ type: z.enum(["cylinder"]), height: z.number(), radiusBottom: z.number(), radiusTop: z.number() })
    .describe("Cylinder or cone. Axis is the local Z axis, centre of the bottom face at the origin. For a plain cylinder radiusTop = radiusBottom."),
  z.object({ type: z.enum(["sphere"]), radius: z.number() }).describe("Sphere centred at the origin."),
  z
    .object({
      type: z.enum(["extrude"]),
      outline: z.array(P2),
      holes: z.array(z.array(P2)),
      height: z.number(),
    })
    .describe(
      "Prism: a 2D profile in the local XY plane extruded from z = 0 to z = height. outline is the outer contour (points around the perimeter), holes are contours of through-holes in the profile. Approximate arcs with points (at least 8 per quarter circle)."
    ),
  z
    .object({ type: z.enum(["revolve"]), profile: z.array(P2), degrees: z.number() })
    .describe(
      "Solid of revolution: a closed profile in the plane (x = radius ≥ 0, y = height) revolved around the local Z axis. degrees = 360 for a full solid."
    ),
]);

const Feature = z.object({
  label: z.string().describe("Short name of the step, e.g. \"base plate\" or \"hole Ø8\"."),
  op: z.enum(["add", "subtract", "intersect"]).describe("What to do with the model built so far. The first step is always add."),
  shape: Shape,
  rotateDeg: V3.describe("Rotation of the solid about its local origin in degrees, applied about X, then Y, then Z. No rotation: 0, 0, 0."),
  position: V3.describe("Where the local origin is moved after rotating (mm)."),
});

export const DrawingModelSchema = z.object({
  isTechnicalDrawing: z
    .boolean()
    .describe("false if the file is not a technical drawing or dimensioned sketch of a part, or the part cannot be determined from it."),
  partName: z.string().describe("Short name of the part, in the customer's language."),
  summary: z.string().describe("1–3 sentences: what the part is and how the model was built, in the customer's language."),
  assumptions: z
    .array(z.string())
    .describe("Dimensions or shapes that were missing or unclear on the drawing and had to be estimated, in the customer's language."),
  warnings: z
    .array(z.string())
    .describe("What the model leaves out (threads, chamfers, tolerances …) or what to watch out for when printing, in the customer's language."),
  confidence: z.enum(["high", "medium", "low"]),
  features: z.array(Feature),
});

export type DrawingModel = z.infer<typeof DrawingModelSchema>;
type FeatureT = z.infer<typeof Feature>;

/** Limity, aby jeden výkres nezaťažil server ani tlačiareň. */
const MAX_FEATURES = 120;
const MAX_POINTS = 600;
const MAX_DIM_MM = 1000;
const MIN_DIM_MM = 0.05;

export class CsgError extends Error {}

type Wasm = Awaited<ReturnType<typeof import("manifold-3d/manifold").default>>;
let wasmReady: Promise<Wasm> | null = null;

function loadManifold(): Promise<Wasm> {
  wasmReady ??= (async () => {
    const Module = (await import("manifold-3d/manifold")).default;
    const wasmBinary = await fs.readFile(path.join(process.cwd(), "node_modules/manifold-3d/manifold.wasm"));
    // Typy poznajú len locateFile; Emscripten prijme aj hotový wasmBinary.
    const w = await Module({ wasmBinary } as unknown as Parameters<typeof Module>[0]);
    w.setup();
    return w;
  })().catch((e) => {
    wasmReady = null;
    throw e;
  });
  return wasmReady;
}

const dim = (v: number, what: string) => {
  if (!Number.isFinite(v) || v < MIN_DIM_MM || v > MAX_DIM_MM) throw new CsgError(`Neplatný rozmer (${what}: ${v}).`);
  return v;
};
const coord = (v: number) => {
  if (!Number.isFinite(v) || Math.abs(v) > MAX_DIM_MM) throw new CsgError(`Neplatná súradnica (${v}).`);
  return v;
};
const loop = (pts: { x: number; y: number }[]) => {
  if (pts.length < 3) throw new CsgError("Obrys má menej ako 3 body.");
  return pts.map((p) => [coord(p.x), coord(p.y)] as [number, number]);
};

/** Počet segmentov kruhu podľa polomeru (~0,4 mm hrana, 24 až 160). */
const segments = (r: number) => Math.max(24, Math.min(160, Math.ceil((2 * Math.PI * r) / 0.4)));

export type CsgResult = { stl: Buffer; dims: { x: number; y: number; z: number }; volumeCm3: number };

export async function buildDrawingStl(model: DrawingModel): Promise<CsgResult> {
  const features = model.features;
  if (!features.length) throw new CsgError("Model nemá žiadne telesá.");
  if (features.length > MAX_FEATURES) throw new CsgError("Model má priveľa krokov.");
  const points = features.reduce((s, f) => {
    const sh = f.shape;
    if (sh.type === "extrude") return s + sh.outline.length + sh.holes.reduce((a, h) => a + h.length, 0);
    if (sh.type === "revolve") return s + sh.profile.length;
    return s;
  }, 0);
  if (points > MAX_POINTS * 4) throw new CsgError("Obrysy majú priveľa bodov.");

  const w = await loadManifold();
  const { Manifold, CrossSection } = w;
  const garbage: { delete: () => void }[] = [];
  const keep = <T extends { delete: () => void }>(o: T) => (garbage.push(o), o);

  const solid = (f: FeatureT) => {
    const sh = f.shape;
    let m;
    switch (sh.type) {
      case "box":
        m = Manifold.cube([dim(sh.sizeX, "sizeX"), dim(sh.sizeY, "sizeY"), dim(sh.sizeZ, "sizeZ")], false);
        break;
      case "cylinder": {
        const rb = sh.radiusBottom === 0 ? 0 : dim(sh.radiusBottom, "radiusBottom");
        const rt = sh.radiusTop === 0 ? 0 : dim(sh.radiusTop, "radiusTop");
        if (!(rb > 0 || rt > 0)) throw new CsgError("Valec bez polomeru.");
        m = Manifold.cylinder(dim(sh.height, "height"), rb, rt, segments(Math.max(rb, rt)), false);
        break;
      }
      case "sphere":
        m = Manifold.sphere(dim(sh.radius, "radius"), segments(sh.radius));
        break;
      case "extrude": {
        if (sh.outline.length > MAX_POINTS) throw new CsgError("Obrys má priveľa bodov.");
        const cs = keep(new CrossSection([loop(sh.outline), ...sh.holes.map(loop)], "EvenOdd"));
        m = cs.extrude(dim(sh.height, "height"));
        break;
      }
      case "revolve": {
        if (sh.profile.length > MAX_POINTS) throw new CsgError("Profil má priveľa bodov.");
        const profile = loop(sh.profile).map(([x, y]) => [Math.max(0, x), y] as [number, number]);
        const cs = keep(new CrossSection([profile], "Positive"));
        const deg = Number.isFinite(sh.degrees) && sh.degrees > 0 ? Math.min(360, sh.degrees) : 360;
        const r = Math.max(...profile.map((p) => p[0]));
        m = cs.revolve(segments(r), deg);
        break;
      }
    }
    keep(m);
    const r = f.rotateDeg;
    const rotated = r.x || r.y || r.z ? keep(m.rotate([coord(r.x), coord(r.y), coord(r.z)])) : m;
    const p = f.position;
    return keep(rotated.translate([coord(p.x), coord(p.y), coord(p.z)]));
  };

  try {
    let acc = null as ReturnType<typeof solid> | null;
    for (const f of features) {
      const s = solid(f);
      if (!acc) {
        if (f.op !== "add") throw new CsgError("Prvý krok musí teleso pridať.");
        acc = s;
      } else {
        acc = keep(f.op === "add" ? acc.add(s) : f.op === "subtract" ? acc.subtract(s) : acc.intersect(s));
      }
    }
    if (!acc || acc.isEmpty()) throw new CsgError("Výsledný model je prázdny.");
    if (acc.status() !== "NoError") throw new CsgError(`Model sa nepodarilo poskladať (${acc.status()}).`);

    // Model na podložku: najnižší bod na z = 0, roh v počiatku.
    const bb = acc.boundingBox();
    const placed = keep(acc.translate([-bb.min[0], -bb.min[1], -bb.min[2]]));
    const mesh = placed.getMesh();
    const dims = { x: bb.max[0] - bb.min[0], y: bb.max[1] - bb.min[1], z: bb.max[2] - bb.min[2] };
    return { stl: meshToStl(mesh.vertProperties, mesh.triVerts, mesh.numProp), dims, volumeCm3: placed.volume() / 1000 };
  } finally {
    for (const o of garbage) {
      try {
        o.delete();
      } catch {}
    }
  }
}

function meshToStl(verts: Float32Array, tris: Uint32Array, numProp: number): Buffer {
  const count = tris.length / 3;
  const buf = Buffer.alloc(84 + count * 50);
  buf.write("vytlacto3d drawing model", 0, "ascii");
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
