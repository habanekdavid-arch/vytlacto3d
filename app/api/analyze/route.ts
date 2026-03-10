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

function parseBinaryStl(buffer: Buffer) {
  if (buffer.length < 84) {
    throw new Error("STL súbor je príliš krátky.");
  }

  const triangleCount = buffer.readUInt32LE(80);
  const expectedLength = 84 + triangleCount * 50;

  if (buffer.length < expectedLength) {
    throw new Error("Neplatný binárny STL súbor.");
  }

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  let signedVolume = 0;

  for (let i = 0; i < triangleCount; i++) {
    const offset = 84 + i * 50;

    const v1: Vec3 = {
      x: buffer.readFloatLE(offset + 12),
      y: buffer.readFloatLE(offset + 16),
      z: buffer.readFloatLE(offset + 20),
    };

    const v2: Vec3 = {
      x: buffer.readFloatLE(offset + 24),
      y: buffer.readFloatLE(offset + 28),
      z: buffer.readFloatLE(offset + 32),
    };

    const v3: Vec3 = {
      x: buffer.readFloatLE(offset + 36),
      y: buffer.readFloatLE(offset + 40),
      z: buffer.readFloatLE(offset + 44),
    };

    minX = Math.min(minX, v1.x, v2.x, v3.x);
    minY = Math.min(minY, v1.y, v2.y, v3.y);
    minZ = Math.min(minZ, v1.z, v2.z, v3.z);

    maxX = Math.max(maxX, v1.x, v2.x, v3.x);
    maxY = Math.max(maxY, v1.y, v2.y, v3.y);
    maxZ = Math.max(maxZ, v1.z, v2.z, v3.z);

    signedVolume +=
      (v1.x * v2.y * v3.z +
        v2.x * v3.y * v1.z +
        v3.x * v1.y * v2.z -
        v1.x * v3.y * v2.z -
        v2.x * v1.y * v3.z -
        v3.x * v2.y * v1.z) / 6;
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

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  let signedVolume = 0;

  for (let i = 0; i < vertices.length; i += 3) {
    const v1 = vertices[i];
    const v2 = vertices[i + 1];
    const v3 = vertices[i + 2];

    minX = Math.min(minX, v1.x, v2.x, v3.x);
    minY = Math.min(minY, v1.y, v2.y, v3.y);
    minZ = Math.min(minZ, v1.z, v2.z, v3.z);

    maxX = Math.max(maxX, v1.x, v2.x, v3.x);
    maxY = Math.max(maxY, v1.y, v2.y, v3.y);
    maxZ = Math.max(maxZ, v1.z, v2.z, v3.z);

    signedVolume +=
      (v1.x * v2.y * v3.z +
        v2.x * v3.y * v1.z +
        v3.x * v1.y * v2.z -
        v1.x * v3.y * v2.z -
        v2.x * v1.y * v3.z -
        v3.x * v2.y * v1.z) / 6;
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

function detectAsciiStl(buffer: Buffer) {
  const head = buffer.slice(0, Math.min(buffer.length, 512)).toString("utf8");
  return head.trimStart().startsWith("solid");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body?.fileKey) {
      return NextResponse.json(
        { error: "Missing fileKey" },
        { status: 400 }
      );
    }

    const filePath = getLocalFilePath(body.fileKey);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: `File not found: ${body.fileKey}` },
        { status: 404 }
      );
    }

    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return NextResponse.json(
        { error: "Invalid file path" },
        { status: 400 }
      );
    }

    const buffer = fs.readFileSync(filePath);

    let analysis: {
      dimsXmm: number;
      dimsYmm: number;
      dimsZmm: number;
      volumeCm3: number;
    };

    if (detectAsciiStl(buffer)) {
      const text = buffer.toString("utf8");
      analysis = parseAsciiStl(text);
    } else {
      analysis = parseBinaryStl(buffer);
    }

    return NextResponse.json({
      ok: true,
      analysis,
      fileKey: body.fileKey,
      fileName: body.fileName ?? path.basename(filePath),
    });
  } catch (e: any) {
    console.error("Analyze API error:", e);
    return NextResponse.json(
      { error: e?.message || "Analyze failed" },
      { status: 500 }
    );
  }
}