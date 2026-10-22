import { NextRequest, NextResponse } from "next/server";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { DOMParser } from "xmldom";

export const runtime = "nodejs";

(globalThis as any).DOMParser = DOMParser;

const MAX_NORMALIZE_MM = 200;

function safeName(name: string) {
  return name.replace(/[^a-z0-9-_]/gi, "_");
}

function parseSvgLengthToMm(value: string | null): number | null {
  if (!value) return null;

  const match = value.trim().match(/^([\d.]+)\s*(mm|cm|in|px|pt)?$/i);
  if (!match) return null;

  const number = Number(match[1]);
  const unit = (match[2] || "px").toLowerCase();

  if (!Number.isFinite(number)) return null;

  if (unit === "mm") return number;
  if (unit === "cm") return number * 10;
  if (unit === "in") return number * 25.4;
  if (unit === "pt") return number * 0.352777778;

  return (number / 96) * 25.4;
}

function getSvgScaleToMm(svgText: string): number {
  const widthMatch  = svgText.match(/<svg[^>]*\swidth=["']([^"']+)["']/i);
  const heightMatch = svgText.match(/<svg[^>]*\sheight=["']([^"']+)["']/i);
  const vbMatch     = svgText.match(/<svg[^>]*\sviewBox=["']([^"']+)["']/i);

  const widthMm  = parseSvgLengthToMm(widthMatch?.[1] ?? null);
  const heightMm = parseSvgLengthToMm(heightMatch?.[1] ?? null);

  let vbW: number | null = null;
  let vbH: number | null = null;
  if (vbMatch) {
    const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite)) {
      vbW = parts[2];
      vbH = parts[3];
    }
  }

  // Case 1: viewBox + physical size → derive scale from physical size
  if (vbW && vbW > 0 && widthMm)                    return widthMm  / vbW;
  if (vbW && vbH && vbH > 0 && heightMm)            return heightMm / vbH;

  // Case 2: viewBox only (no physical size) → normalize longest side to MAX_NORMALIZE_MM
  if (vbW && vbW > 0 && vbH && vbH > 0) {
    return MAX_NORMALIZE_MM / Math.max(vbW, vbH);
  }

  // Case 3: physical size without viewBox → SVGLoader uses raw user units, convert to mm
  if (widthMm && widthMatch?.[1]) {
    const widthRaw = parseFloat(widthMatch[1]);
    if (widthRaw > 0) return widthMm / widthRaw;
  }
  if (heightMm && heightMatch?.[1]) {
    const heightRaw = parseFloat(heightMatch[1]);
    if (heightRaw > 0) return heightMm / heightRaw;
  }

  // Fallback: assume 96 dpi (1 user unit = 1 px)
  return 25.4 / 96;
}

function triangleNormal(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) {
  const cb = new THREE.Vector3().subVectors(c, b);
  const ab = new THREE.Vector3().subVectors(a, b);
  return cb.cross(ab).normalize();
}

/** Znamienkový objem — záporný znamená plochy otočené dovnútra. */
function signedVolume(geometry: THREE.BufferGeometry): number {
  const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry;
  const p = nonIndexed.getAttribute("position");
  let volume = 0;
  for (let i = 0; i < p.count; i += 3) {
    const ax = p.getX(i), ay = p.getY(i), az = p.getZ(i);
    const bx = p.getX(i + 1), by = p.getY(i + 1), bz = p.getZ(i + 1);
    const cx = p.getX(i + 2), cy = p.getY(i + 2), cz = p.getZ(i + 2);
    volume += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  if (nonIndexed !== geometry) nonIndexed.dispose();
  return volume;
}

function geometryToAsciiStl(geometry: THREE.BufferGeometry, name: string, flipWinding = false): string {
  const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = nonIndexed.getAttribute("position");

  let stl = `solid ${safeName(name)}\n`;

  for (let i = 0; i < position.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(position, i);
    // Pri otočení poradia vrcholov sa normála otočí von.
    const b = new THREE.Vector3().fromBufferAttribute(position, flipWinding ? i + 2 : i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(position, flipWinding ? i + 1 : i + 2);

    const normal = triangleNormal(a, b, c);

    stl += `  facet normal ${normal.x} ${normal.y} ${normal.z}\n`;
    stl += `    outer loop\n`;
    stl += `      vertex ${a.x} ${a.y} ${a.z}\n`;
    stl += `      vertex ${b.x} ${b.y} ${b.z}\n`;
    stl += `      vertex ${c.x} ${c.y} ${c.z}\n`;
    stl += `    endloop\n`;
    stl += `  endfacet\n`;
  }

  stl += `endsolid ${safeName(name)}\n`;

  if (nonIndexed !== geometry) nonIndexed.dispose();

  return stl;
}

function getGlobalBox(geometries: THREE.BufferGeometry[]): THREE.Box3 {
  const globalBox = new THREE.Box3();

  for (const geometry of geometries) {
    geometry.computeBoundingBox();
    if (geometry.boundingBox) globalBox.union(geometry.boundingBox);
  }

  return globalBox;
}

export async function POST(req: NextRequest) {
  const start = Date.now();

  try {
    const formData = await req.formData();

    const file = formData.get("file");
    const thicknessRaw = Number(formData.get("thicknessMm") ?? 10);
    const thicknessMm =
      Number.isFinite(thicknessRaw) && thicknessRaw > 0 ? thicknessRaw : 10;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing SVG file." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".svg")) {
      return NextResponse.json(
        { error: "Podporovaný je iba SVG súbor." },
        { status: 400 }
      );
    }

    const svgText = await file.text();
    const scaleToMm = getSvgScaleToMm(svgText);

    // Warn about transforms — SVGLoader handles basic cases but nested transforms may distort
    if (/<[^>]+\stransform=["'][^"']/i.test(svgText)) {
      console.warn("svg-to-stl: SVG obsahuje transform atribúty — výsledok sa môže líšiť");
    }

    const loader = new SVGLoader();
    const svgData = loader.parse(svgText);

    if (svgData.paths.length === 0) {
      return NextResponse.json(
        { error: "SVG neobsahuje žiadne tvary." },
        { status: 400 }
      );
    }

    const geometries: THREE.BufferGeometry[] = [];
    let hadFillShapes = false;

    for (const path of svgData.paths) {
      // Detect arc / circle paths → use higher curve resolution
      const pathD =
        ((path.userData as any)?.node?.getAttribute?.("d") as string) ?? "";
      const nodeTag =
        ((path.userData as any)?.node?.nodeName as string ?? "").toLowerCase();
      const hasArc =
        /[aA]/.test(pathD) ||
        nodeTag === "circle" ||
        nodeTag === "ellipse";
      const curveSegments = hasArc ? 32 : 16;

      // Prefer fill shapes; fall back to stroke interpretation for stroke-only paths
      const fillShapes = SVGLoader.createShapes(path);
      if (fillShapes.length > 0) hadFillShapes = true;
      const shapes = fillShapes.length > 0 ? fillShapes : path.toShapes(true);

      for (const shape of shapes) {
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: thicknessMm,
          bevelEnabled: false,
          curveSegments,
          steps: 1,
        });

        geometry.scale(scaleToMm, scaleToMm, 1);
        geometry.computeBoundingBox();

        // Skip degenerate geometries (0 triangles or non-finite bounding box)
        const posAttr = geometry.getAttribute("position");
        if (!posAttr || posAttr.count < 3) {
          geometry.dispose();
          continue;
        }
        if (
          !geometry.boundingBox ||
          !isFinite(geometry.boundingBox.min.x) ||
          !isFinite(geometry.boundingBox.max.x)
        ) {
          geometry.dispose();
          continue;
        }

        geometry.computeVertexNormals();
        geometries.push(geometry);
      }
    }

    if (geometries.length === 0) {
      const errorMsg = hadFillShapes
        ? "SVG neobsahuje žiadne tvary."
        : "SVG obsahuje iba čiary (stroke). Skús súbor uložiť s vyplnenými tvarmi (fill).";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    /**
     * Preklopenie osi Y: SVG má Y smerom dole, 3D model hore. Bez neho by
     * bol model zrkadlový; preklopenie X (ako predtým) ho len otočilo
     * o 180° — tlačil sa správne, ale v náhľade bol hore nohami.
     * Všetky tvary sa preklopia podľa spoločného stredu, aby ostali pohromade.
     */
    const globalBox = getGlobalBox(geometries);
    const centerY = (globalBox.min.y + globalBox.max.y) / 2;

    for (const geometry of geometries) {
      geometry.translate(0, -centerY, 0);
      geometry.scale(1, -1, 1);
      geometry.translate(0, centerY, 0);
      geometry.computeBoundingBox();
      geometry.computeVertexNormals();
    }

    /**
     * Posun celého modelu do kladných súradníc.
     * Všetky časti sa posúvajú rovnakou hodnotou aby ostali pokope.
     */
    const fixedGlobalBox = getGlobalBox(geometries);

    // Zrkadlenie vyššie otočí poradie vrcholov, takže plochy by mierili
    // dovnútra (slicery to niekedy opravia, náhľad by model ukázal dutý).
    // Smer sa určí z objemu, nech sedí bez ohľadu na zdroj SVG.
    const flipWinding = geometries.reduce((sum, g) => sum + signedVolume(g), 0) < 0;

    const stlParts: string[] = [];

    for (const geometry of geometries) {
      geometry.translate(
        -fixedGlobalBox.min.x,
        -fixedGlobalBox.min.y,
        -fixedGlobalBox.min.z
      );
      geometry.computeBoundingBox();
      geometry.computeVertexNormals();

      stlParts.push(geometryToAsciiStl(geometry, file.name, flipWinding));
      geometry.dispose();
    }

    console.log(`svg-to-stl: ${geometries.length} shapes, ${Date.now() - start}ms`);

    const stlText = stlParts.join("\n");
    const outputFileName = file.name.replace(/\.svg$/i, ".stl");

    return new NextResponse(stlText, {
      status: 200,
      headers: {
        "Content-Type": "model/stl",
        "Content-Disposition": `attachment; filename="${outputFileName}"`,
        "X-Generated-File-Name": outputFileName,
      },
    });
  } catch (error: any) {
    console.error("svg-to-stl error:", error);

    return NextResponse.json(
      { error: error?.message || "SVG konverzia zlyhala." },
      { status: 500 }
    );
  }
}
