import * as THREE from "three";

/**
 * Rozdelenie modelu na samostatné časti (spojité telesá) — pre viacfarebnú
 * tlač. Trojuholníky so spoločným vrcholom patria k tej istej časti; vrcholy
 * sa zlučujú podľa polohy (STL nemá indexy, každý trojuholník má vlastné).
 *
 * Poradie častí je pevné (od najväčšej podľa objemu), aby zákazník aj výroba
 * v administrácii videli pod rovnakým číslom tú istú časť.
 */
export type ModelPart = {
  geometry: THREE.BufferGeometry;
  /** Objem časti v cm³ (model v mm). */
  volumeCm3: number;
  triangles: number;
};

/** Nad týmto počtom trojuholníkov by delenie zbytočne zdržalo náhľad. */
export const MAX_SPLIT_TRIANGLES = 400_000;

export function splitIntoParts(source: THREE.BufferGeometry, maxParts: number): ModelPart[] | null {
  const geometry = source.index ? source.toNonIndexed() : source;
  const pos = geometry.getAttribute("position");
  const triCount = Math.floor(pos.count / 3);
  if (triCount === 0 || triCount > MAX_SPLIT_TRIANGLES) return null;

  // Zlúčenie vrcholov podľa polohy (mriežka 1 µm).
  const ids = new Map<string, number>();
  const vertexId = new Int32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const key = `${Math.round(pos.getX(i) * 1000)},${Math.round(pos.getY(i) * 1000)},${Math.round(pos.getZ(i) * 1000)}`;
    let id = ids.get(key);
    if (id === undefined) {
      id = ids.size;
      ids.set(key, id);
    }
    vertexId[i] = id;
  }

  // Union-find nad vrcholmi.
  const parent = new Int32Array(ids.size);
  for (let i = 0; i < parent.length; i++) parent[i] = i;
  const find = (a: number): number => {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]];
      a = parent[a];
    }
    return a;
  };
  const unite = (a: number, b: number) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  for (let t = 0; t < triCount; t++) {
    unite(vertexId[t * 3], vertexId[t * 3 + 1]);
    unite(vertexId[t * 3], vertexId[t * 3 + 2]);
  }

  // Trojuholníky podľa časti.
  const groups = new Map<number, number[]>();
  for (let t = 0; t < triCount; t++) {
    const root = find(vertexId[t * 3]);
    const list = groups.get(root);
    if (list) list.push(t);
    else groups.set(root, [t]);
  }
  if (groups.size > maxParts) return null;

  const parts: (ModelPart & { cx: number; cy: number; cz: number })[] = [];
  for (const tris of groups.values()) {
    const arr = new Float32Array(tris.length * 9);
    let volume = 0, cx = 0, cy = 0, cz = 0;
    tris.forEach((t, k) => {
      for (let v = 0; v < 3; v++) {
        const i = t * 3 + v;
        arr[k * 9 + v * 3] = pos.getX(i);
        arr[k * 9 + v * 3 + 1] = pos.getY(i);
        arr[k * 9 + v * 3 + 2] = pos.getZ(i);
      }
      const [ax, ay, az, bx, by, bz, qx, qy, qz] = arr.subarray(k * 9, k * 9 + 9);
      volume += (ax * (by * qz - bz * qy) - ay * (bx * qz - bz * qx) + az * (bx * qy - by * qx)) / 6;
      cx += ax + bx + qx;
      cy += ay + by + qy;
      cz += az + bz + qz;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const n = tris.length * 3;
    parts.push({ geometry: g, volumeCm3: Math.abs(volume) / 1000, triangles: tris.length, cx: cx / n, cy: cy / n, cz: cz / n });
  }

  // Od najväčšej; pri zhode rozhodne poloha, aby poradie bolo vždy rovnaké.
  parts.sort((a, b) =>
    Math.abs(b.volumeCm3 - a.volumeCm3) > 1e-6
      ? b.volumeCm3 - a.volumeCm3
      : a.cx - b.cx || a.cy - b.cy || a.cz - b.cz
  );
  if (geometry !== source) geometry.dispose();
  return parts.map(({ geometry, volumeCm3, triangles }) => ({ geometry, volumeCm3, triangles }));
}
