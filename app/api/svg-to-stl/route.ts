import { NextRequest, NextResponse } from "next/server";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { DOMParser } from "xmldom";

export const runtime = "nodejs";

(globalThis as any).DOMParser = DOMParser;

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

  // SVG/CSS default: 96 px = 1 inch
  return (number / 96) * 25.4;
}

function getSvgScaleToMm(svgText: string) {
  const widthMatch = svgText.match(/<svg[^>]*\swidth=["']([^"']+)["']/i);
  const heightMatch = svgText.match(/<svg[^>]*\sheight=["']([^"']+)["']/i);
  const viewBoxMatch = svgText.match(/<svg[^>]*\sviewBox=["']([^"']+)["']/i);

  const widthMm = parseSvgLengthToMm(widthMatch?.[1] ?? null);
  const heightMm = parseSvgLengthToMm(heightMatch?.[1] ?? null);

  if (viewBoxMatch && (widthMm || heightMm)) {
    const parts = viewBoxMatch[1]
      .trim()
      .split(/[\s,]+/)
      .map(Number);

    if (parts.length === 4) {
      const viewBoxWidth = parts[2];
      const viewBoxHeight = parts[3];

      if (widthMm && Number.isFinite(viewBoxWidth) && viewBoxWidth > 0) {
        return widthMm / viewBoxWidth;
      }

      if (heightMm && Number.isFinite(viewBoxHeight) && viewBoxHeight > 0) {
        return heightMm / viewBoxHeight;
      }
    }
  }

  // fallback: 1 SVG unit = 1 mm
  return 1;
}

function triangleNormal(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) {
  const cb = new THREE.Vector3().subVectors(c, b);
  const ab = new THREE.Vector3().subVectors(a, b);
  return cb.cross(ab).normalize();
}

function geometryToAsciiStl(geometry: THREE.BufferGeometry, name: string) {
  const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = nonIndexed.getAttribute("position");

  let stl = `solid ${safeName(name)}\n`;

  for (let i = 0; i < position.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(position, i);
    const b = new THREE.Vector3().fromBufferAttribute(position, i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(position, i + 2);

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

  if (nonIndexed !== geometry) {
    nonIndexed.dispose();
  }

  return stl;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");
    const thicknessRaw = Number(formData.get("thicknessMm") ?? 10);

    const thicknessMm =
      Number.isFinite(thicknessRaw) && thicknessRaw > 0 ? thicknessRaw : 10;

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing SVG file." },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".svg")) {
      return NextResponse.json(
        { error: "Podporovaný je iba SVG súbor." },
        { status: 400 }
      );
    }

    const svgText = await file.text();
    const scaleToMm = getSvgScaleToMm(svgText);

    const loader = new SVGLoader();
    const svgData = loader.parse(svgText);

    const geometries: THREE.BufferGeometry[] = [];

    for (const path of svgData.paths) {
      const shapes = SVGLoader.createShapes(path);

      for (const shape of shapes) {
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: thicknessMm,
          bevelEnabled: false,
          curveSegments: 16,
          steps: 1,
        });

        geometry.scale(scaleToMm, scaleToMm, 1);

        geometry.computeBoundingBox();
        geometry.computeVertexNormals();

        geometries.push(geometry);
      }
    }

    if (geometries.length === 0) {
      return NextResponse.json(
        {
          error:
            "SVG sa nepodarilo previesť. Skontrolujte, či obsahuje uzavreté vyplnené tvary, nie iba čiary/stroke.",
        },
        { status: 400 }
      );
    }

    const group = new THREE.Group();

    for (const geometry of geometries) {
      group.add(new THREE.Mesh(geometry));
    }

    const box = new THREE.Box3().setFromObject(group);

    const allStlParts: string[] = [];

    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geometry = child.geometry.clone();

        geometry.translate(-box.min.x, -box.min.y, -box.min.z);

        allStlParts.push(geometryToAsciiStl(geometry, file.name));

        geometry.dispose();
      }
    });

    for (const geometry of geometries) {
      geometry.dispose();
    }

    const stlText = allStlParts.join("\n");
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
      {
        error: error?.message || "SVG konverzia zlyhala.",
      },
      { status: 500 }
    );
  }
}