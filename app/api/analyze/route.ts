import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getLocalFilePath } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

// Nad týmto sa model odmietne ešte pred stiahnutím. Súradnice sa držia
// vo Float32Array (4 B na číslo), takže 100 MB STL si vypýta ~72 MB navyše
// a do funkcie sa zmestí.
const MAX_MODEL_BYTES = 100 * 1024 * 1024;

class ModelTooLargeError extends Error {
  readonly status = 413;

  constructor(bytes: number) {
    super(
      `Model má ${(bytes / 1024 / 1024).toFixed(1)} MB, maximum je ${
        MAX_MODEL_BYTES / 1024 / 1024
      } MB. Skúste znížiť počet trojuholníkov modelu.`
    );
  }
}

/**
 * Objem štvorstena (0, v1, v2, v3) — súradnice sú ploché, indexy ukazujú
 * na začiatok trojice x/y/z.
 */
function triangleVolume(
  coords: ArrayLike<number>,
  a: number,
  b: number,
  c: number
) {
  const x1 = coords[a], y1 = coords[a + 1], z1 = coords[a + 2];
  const x2 = coords[b], y2 = coords[b + 1], z2 = coords[b + 2];
  const x3 = coords[c], y3 = coords[c + 1], z3 = coords[c + 2];

  return (
    x1 * y2 * z3 +
    x2 * y3 * z1 +
    x3 * y1 * z2 -
    x1 * y3 * z2 -
    x2 * y1 * z3 -
    x3 * y2 * z1
  ) / 6;
}

/**
 * Rastúce pole súradníc pre formáty, ktoré počet vrcholov vopred neprezradia.
 */
class VertexBuffer {
  private coords = new Float32Array(3 * 1024);
  private written = 0;

  push(x: number, y: number, z: number) {
    if (this.written + 3 > this.coords.length) {
      const grown = new Float32Array(this.coords.length * 2);
      grown.set(this.coords);
      this.coords = grown;
    }

    this.coords[this.written++] = x;
    this.coords[this.written++] = y;
    this.coords[this.written++] = z;
  }

  get values(): Float32Array {
    return this.coords;
  }

  get vertexCount(): number {
    return this.written / 3;
  }
}

function buildAnalysis(
  coords: ArrayLike<number>,
  vertexCount: number,
  faces?: number[][]
) {
  if (vertexCount < 3) {
    throw new Error("Model neobsahuje dostatok vrcholov.");
  }

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < vertexCount; i++) {
    const o = i * 3;
    const x = coords[o];
    const y = coords[o + 1];
    const z = coords[o + 2];

    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;

    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }

  let signedVolume = 0;

  if (faces?.length) {
    for (const face of faces) {
      if (face.length < 3) continue;

      const first = face[0];
      if (first < 0 || first >= vertexCount) continue;

      for (let i = 1; i < face.length - 1; i++) {
        const second = face[i];
        const third = face[i + 1];

        if (second < 0 || second >= vertexCount) continue;
        if (third < 0 || third >= vertexCount) continue;

        signedVolume += triangleVolume(coords, first * 3, second * 3, third * 3);
      }
    }
  } else {
    for (let i = 0; i + 2 < vertexCount; i += 3) {
      signedVolume += triangleVolume(coords, i * 3, (i + 1) * 3, (i + 2) * 3);
    }
  }

  const dimsXmm = Number((maxX - minX).toFixed(2));
  const dimsYmm = Number((maxY - minY).toFixed(2));
  const dimsZmm = Number((maxZ - minZ).toFixed(2));

  const volumeMm3 = Math.abs(signedVolume);
  const volumeCm3 = Number((volumeMm3 / 1000).toFixed(2));

  return {
    dimsXmm,
    dimsYmm,
    dimsZmm,
    volumeCm3,
  };
}

function parseBinaryStl(buffer: Buffer) {
  if (buffer.length < 84) {
    throw new Error("STL súbor je príliš krátky.");
  }

  const triangleCount = buffer.readUInt32LE(80);
  const expectedLength = 84 + triangleCount * 50;

  if (buffer.length < expectedLength) {
    throw new Error("Neplatný binárny STL súbor.");
  }

  const coords = new Float32Array(triangleCount * 9);
  let written = 0;

  for (let i = 0; i < triangleCount; i++) {
    // 12 B normály na začiatku trojuholníka preskakujeme, nasledujú 3 vrcholy.
    const offset = 84 + i * 50 + 12;

    for (let value = 0; value < 9; value++) {
      coords[written++] = buffer.readFloatLE(offset + value * 4);
    }
  }

  return buildAnalysis(coords, triangleCount * 3);
}

function parseAsciiStl(text: string) {
  const vertexRegex =
    /vertex\s+([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:e[+-]?\d+)?)/gi;

  const vertices = new VertexBuffer();
  let match: RegExpExecArray | null;

  while ((match = vertexRegex.exec(text)) !== null) {
    vertices.push(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  const count = vertices.vertexCount;

  if (count < 3 || count % 3 !== 0) {
    throw new Error("Neplatný ASCII STL súbor.");
  }

  return buildAnalysis(vertices.values, count);
}

function parseObj(text: string) {
  const vertices = new VertexBuffer();
  const faces: number[][] = [];

  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) continue;

    if (line.startsWith("v ")) {
      const parts = line.split(/\s+/);

      const x = Number(parts[1]);
      const y = Number(parts[2]);
      const z = Number(parts[3]);

      if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
        vertices.push(x, y, z);
      }
    }

    if (line.startsWith("f ")) {
      const parts = line.split(/\s+/).slice(1);

      const face = parts
        .map((part) => {
          const vertexIndexRaw = part.split("/")[0];
          const vertexIndex = Number(vertexIndexRaw);

          if (!Number.isFinite(vertexIndex) || vertexIndex === 0) return null;

          return vertexIndex > 0
            ? vertexIndex - 1
            : vertices.vertexCount + vertexIndex;
        })
        .filter((index): index is number => index !== null);

      if (face.length >= 3) {
        faces.push(face);
      }
    }
  }

  if (vertices.vertexCount < 3) {
    throw new Error("OBJ súbor neobsahuje platné vrcholy.");
  }

  if (faces.length === 0) {
    throw new Error("OBJ súbor neobsahuje platné plochy.");
  }

  return buildAnalysis(vertices.values, vertices.vertexCount, faces);
}

function startsWithSolid(buffer: Buffer) {
  return buffer
    .subarray(0, Math.min(buffer.length, 80))
    .toString("latin1")
    .trimStart()
    .startsWith("solid");
}

/**
 * Binárne STL nesie počet trojuholníkov v hlavičke, takže sa dá overiť dĺžkou
 * súboru. Na úvodné slovo sa spoliehať nedá: viacero CAD exportérov zapisuje
 * do 80-bajtovej hlavičky binárneho súboru text začínajúci slovom "solid"
 * a takýto model potom skončil v ASCII vetve, kde nemal jediný vrchol.
 */
function isBinaryStl(buffer: Buffer) {
  if (buffer.length < 84) return false;

  const triangleCount = buffer.readUInt32LE(80);

  if (buffer.length === 84 + triangleCount * 50) return true;

  // Dĺžka nesedí (napr. prílepok na konci súboru) — rozhodne až úvodné slovo.
  return !startsWithSolid(buffer);
}

function parseStl(buffer: Buffer) {
  if (isBinaryStl(buffer)) {
    return parseBinaryStl(buffer);
  }

  try {
    return parseAsciiStl(buffer.toString("utf8"));
  } catch (asciiError) {
    // Poistka pre súbory, ktoré vyzerajú ako ASCII, ale ním nie sú. Keď ani
    // binárne čítanie nevyjde, zákazníkovi hlásime pôvodnú chybu — tá lepšie
    // popisuje súbor, ktorý naozaj poslal.
    if (buffer.length >= 84) {
      try {
        return parseBinaryStl(buffer);
      } catch {
        throw asciiError;
      }
    }

    throw asciiError;
  }
}

async function loadModelBuffer(fileKey: string) {
  if (fileKey.startsWith("http://") || fileKey.startsWith("https://")) {
    const res = await fetch(fileKey, { cache: "no-store" });

    if (!res.ok) {
      throw new Error(`Nepodarilo sa načítať vzdialený súbor (${res.status}).`);
    }

    const declaredLength = Number(res.headers.get("content-length"));

    if (Number.isFinite(declaredLength) && declaredLength > MAX_MODEL_BYTES) {
      throw new ModelTooLargeError(declaredLength);
    }

    const arr = await res.arrayBuffer();

    if (arr.byteLength > MAX_MODEL_BYTES) {
      throw new ModelTooLargeError(arr.byteLength);
    }

    return Buffer.from(arr);
  }

  const filePath = getLocalFilePath(fileKey);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${fileKey}`);
  }

  const stat = fs.statSync(filePath);

  if (!stat.isFile()) {
    throw new Error("Invalid file path");
  }

  if (stat.size > MAX_MODEL_BYTES) {
    throw new ModelTooLargeError(stat.size);
  }

  return fs.readFileSync(filePath);
}

function getExtension(fileNameOrKey: string) {
  const clean = fileNameOrKey.split("?")[0].toLowerCase();
  return path.extname(clean);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body?.fileKey) {
      return NextResponse.json({ error: "Missing fileKey" }, { status: 400 });
    }

    const fileName = String(body.fileName ?? path.basename(body.fileKey));
    const ext = getExtension(fileName || body.fileKey);

    if (ext !== ".stl" && ext !== ".obj") {
      return NextResponse.json(
        { error: "Podporované sú iba STL a OBJ súbory." },
        { status: 400 }
      );
    }

    const buffer = await loadModelBuffer(body.fileKey);

    const analysis =
      ext === ".obj" ? parseObj(buffer.toString("utf8")) : parseStl(buffer);

    return NextResponse.json({
      ok: true,
      analysis,
      fileKey: body.fileKey,
      fileName,
      fileType: ext.replace(".", "").toUpperCase(),
      warning:
        ext === ".obj"
          ? "Pri OBJ súboroch odporúčame skontrolovať rozmery modelu, pretože formát nemusí vždy obsahovať správnu mierku."
          : null,
    });
  } catch (e: any) {
    console.error("Analyze API error:", e);

    const status = typeof e?.status === "number" ? e.status : 500;

    return NextResponse.json(
      { error: e?.message || "Analyze failed" },
      { status }
    );
  }
}
