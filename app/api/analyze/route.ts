import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getLocalFilePath } from "@/lib/storage";

export const runtime = "nodejs";

type Vec3 = {
  x: number;
  y: number;
  z: number;
};

function triangleVolume(v1: Vec3, v2: Vec3, v3: Vec3) {
  return (
    v1.x * v2.y * v3.z +
    v2.x * v3.y * v1.z +
    v3.x * v1.y * v2.z -
    v1.x * v3.y * v2.z -
    v2.x * v1.y * v3.z -
    v3.x * v2.y * v1.z
  ) / 6;
}

function buildAnalysis(vertices: Vec3[], faces?: number[][]) {
  if (vertices.length < 3) {
    throw new Error("Model neobsahuje dostatok vrcholov.");
  }

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (const v of vertices) {
    minX = Math.min(minX, v.x);
    minY = Math.min(minY, v.y);
    minZ = Math.min(minZ, v.z);

    maxX = Math.max(maxX, v.x);
    maxY = Math.max(maxY, v.y);
    maxZ = Math.max(maxZ, v.z);
  }

  let signedVolume = 0;

  if (faces?.length) {
    for (const face of faces) {
      if (face.length < 3) continue;

      const first = vertices[face[0]];

      for (let i = 1; i < face.length - 1; i++) {
        const v2 = vertices[face[i]];
        const v3 = vertices[face[i + 1]];

        if (first && v2 && v3) {
          signedVolume += triangleVolume(first, v2, v3);
        }
      }
    }
  } else {
    for (let i = 0; i < vertices.length; i += 3) {
      const v1 = vertices[i];
      const v2 = vertices[i + 1];
      const v3 = vertices[i + 2];

      if (v1 && v2 && v3) {
        signedVolume += triangleVolume(v1, v2, v3);
      }
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

  const vertices: Vec3[] = [];

  for (let i = 0; i < triangleCount; i++) {
    const offset = 84 + i * 50;

    vertices.push(
      {
        x: buffer.readFloatLE(offset + 12),
        y: buffer.readFloatLE(offset + 16),
        z: buffer.readFloatLE(offset + 20),
      },
      {
        x: buffer.readFloatLE(offset + 24),
        y: buffer.readFloatLE(offset + 28),
        z: buffer.readFloatLE(offset + 32),
      },
      {
        x: buffer.readFloatLE(offset + 36),
        y: buffer.readFloatLE(offset + 40),
        z: buffer.readFloatLE(offset + 44),
      }
    );
  }

  return buildAnalysis(vertices);
}

function parseAsciiStl(text: string) {
  const vertexRegex =
    /vertex\s+([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:e[+-]?\d+)?)/gi;

  const vertices: Vec3[] = [];
  let match: RegExpExecArray | null;

  while ((match = vertexRegex.exec(text)) !== null) {
    vertices.push({
      x: Number(match[1]),
      y: Number(match[2]),
      z: Number(match[3]),
    });
  }

  if (vertices.length < 3 || vertices.length % 3 !== 0) {
    throw new Error("Neplatný ASCII STL súbor.");
  }

  return buildAnalysis(vertices);
}

function parseObj(text: string) {
  const vertices: Vec3[] = [];
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
        vertices.push({ x, y, z });
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
            : vertices.length + vertexIndex;
        })
        .filter((index): index is number => index !== null);

      if (face.length >= 3) {
        faces.push(face);
      }
    }
  }

  if (vertices.length < 3) {
    throw new Error("OBJ súbor neobsahuje platné vrcholy.");
  }

  if (faces.length === 0) {
    throw new Error("OBJ súbor neobsahuje platné plochy.");
  }

  return buildAnalysis(vertices, faces);
}

function detectAsciiStl(buffer: Buffer) {
  const head = buffer.slice(0, Math.min(buffer.length, 512)).toString("utf8");
  return head.trimStart().startsWith("solid");
}

async function loadModelBuffer(fileKey: string) {
  if (fileKey.startsWith("http://") || fileKey.startsWith("https://")) {
    const res = await fetch(fileKey, { cache: "no-store" });

    if (!res.ok) {
      throw new Error(`Nepodarilo sa načítať vzdialený súbor (${res.status}).`);
    }

    const arr = await res.arrayBuffer();
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

    let analysis: {
      dimsXmm: number;
      dimsYmm: number;
      dimsZmm: number;
      volumeCm3: number;
    };

    if (ext === ".obj") {
      analysis = parseObj(buffer.toString("utf8"));
    } else if (detectAsciiStl(buffer)) {
      analysis = parseAsciiStl(buffer.toString("utf8"));
    } else {
      analysis = parseBinaryStl(buffer);
    }

    const MAX_DIM_MM = 700;
    if (
      analysis.dimsXmm > MAX_DIM_MM ||
      analysis.dimsYmm > MAX_DIM_MM ||
      analysis.dimsZmm > MAX_DIM_MM
    ) {
      return NextResponse.json(
        {
          error: `Model je príliš veľký. Maximálna povolená veľkosť je ${MAX_DIM_MM} × ${MAX_DIM_MM} × ${MAX_DIM_MM} mm. Váš model má rozmery ${analysis.dimsXmm} × ${analysis.dimsYmm} × ${analysis.dimsZmm} mm.`,
          code: "MODEL_TOO_LARGE",
          dims: { x: analysis.dimsXmm, y: analysis.dimsYmm, z: analysis.dimsZmm },
        },
        { status: 422 }
      );
    }

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

    return NextResponse.json(
      { error: e?.message || "Analyze failed" },
      { status: 500 }
    );
  }
}