import fs from "fs/promises";
import path from "path";
import * as THREE from "three";
import { STLLoader } from "three-stdlib";

export type StlAnalysis = {
  dimsXmm: number;
  dimsYmm: number;
  dimsZmm: number;
  volumeCm3: number;
};

export async function analyzeStlLocal(fileKey: string): Promise<StlAnalysis> {
  const dir = process.env.LOCAL_UPLOAD_DIR ?? "uploads";
  const fullPath = path.join(process.cwd(), dir, fileKey);

  const buf = await fs.readFile(fullPath);

  const loader = new STLLoader();
  const geometry = loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;

  if (!bb) throw new Error("Nepodarilo sa vypočítať bounding box.");

  const size = new THREE.Vector3();
  bb.getSize(size);

  // STL je väčšinou v mm; size je v rovnakých jednotkách ako model
  const dimsXmm = size.x;
  const dimsYmm = size.y;
  const dimsZmm = size.z;

  // Odhad objemu: využijeme signed volume z trojuholníkov (funguje pre uzavreté mesh-e)
  const pos = geometry.attributes.position;
  let volumeMm3 = 0;

  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();

  for (let i = 0; i < pos.count; i += 3) {
    v0.fromBufferAttribute(pos as any, i);
    v1.fromBufferAttribute(pos as any, i + 1);
    v2.fromBufferAttribute(pos as any, i + 2);

    // Signed volume of tetrahedron (0, v0, v1, v2)
    volumeMm3 += v0.dot(v1.cross(v2)) / 6.0;
  }

  volumeMm3 = Math.abs(volumeMm3);

  const volumeCm3 = volumeMm3 / 1000; // 1 cm3 = 1000 mm3

  return {
    dimsXmm,
    dimsYmm,
    dimsZmm,
    volumeCm3,
  };
}
