import { NextRequest, NextResponse } from "next/server";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { DOMParser } from "xmldom";

export const runtime = "nodejs";

(globalThis as any).DOMParser = DOMParser;

function safeName(name: string) {
  return name.replace(/[^a-z0-9-_]/gi, "_");
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

    const loader = new SVGLoader();
    const svgData = loader.parse(svgText);

    const geometries: THREE.BufferGeometry[] = [];

    for (const path of svgData.paths) {
      const shapes = SVGLoader.createShapes(path);

      for (const shape of shapes) {
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: thicknessMm,
          bevelEnabled: false,
          curveSegments: 12,
          steps: 1,
        });

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
      const mesh = new THREE.Mesh(geometry);
      group.add(mesh);
    }

    const box = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const allStlParts: string[] = [];

    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geometry = child.geometry.clone();

        geometry.translate(-center.x, -box.min.y, -center.z);
        geometry.rotateX(-Math.PI / 2);

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