import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { getSafeServerSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getLocalFilePath } from "@/lib/storage";

export const runtime = "nodejs";

async function readFileBytes(fileKey: string): Promise<Buffer> {
  if (fileKey.startsWith("http://") || fileKey.startsWith("https://")) {
    const res = await fetch(fileKey);
    if (!res.ok) throw new Error(`Failed to fetch ${fileKey}: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  const fs = await import("fs/promises");
  return fs.readFile(getLocalFilePath(fileKey));
}

// Avoids overwriting entries in the zip when two models share a file name.
function uniqueZipName(name: string, used: Map<string, number>): string {
  const count = used.get(name) ?? 0;
  used.set(name, count + 1);
  if (count === 0) return name;

  const dot = name.lastIndexOf(".");
  const base = dot === -1 ? name : name.slice(0, dot);
  const ext = dot === -1 ? "" : name.slice(dot);
  return `${base} (${count})${ext}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSafeServerSession();
  const userEmail = String((session?.user as any)?.email ?? "").toLowerCase();
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!userEmail || !adminEmails.includes(userEmail)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      orderNumber: true,
      fileKey: true,
      fileName: true,
      orderItems: { select: { fileKey: true, fileName: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Objednávka neexistuje." }, { status: 404 });
  }

  const files =
    order.orderItems.length > 0
      ? order.orderItems
      : [{ fileKey: order.fileKey, fileName: order.fileName }];

  const zip = new JSZip();
  const usedNames = new Map<string, number>();
  const failed: string[] = [];

  for (const file of files) {
    try {
      const bytes = await readFileBytes(file.fileKey);
      zip.file(uniqueZipName(file.fileName, usedNames), bytes);
    } catch (err) {
      console.error("download-all: failed to fetch file", file.fileKey, err);
      failed.push(file.fileName);
    }
  }

  if (Object.keys(zip.files).length === 0) {
    return NextResponse.json(
      { error: "Žiadny zo súborov sa nepodarilo načítať." },
      { status: 500 }
    );
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  const zipName = `objednavka-${order.orderNumber ?? id}.zip`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipName}"`,
      ...(failed.length > 0 ? { "X-Failed-Files": encodeURIComponent(failed.join(", ")) } : {}),
    },
  });
}
