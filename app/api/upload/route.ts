import { NextRequest, NextResponse } from "next/server";
import { storeFileLocal } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Chýba súbor." }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  if (!name.endsWith(".stl")) {
    return NextResponse.json({ error: "Podporujeme len STL (.stl)." }, { status: 400 });
  }

  const maxMb = 120;
  if (file.size > maxMb * 1024 * 1024) {
    return NextResponse.json({ error: `Max veľkosť je ${maxMb} MB.` }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const stored = await storeFileLocal(buf, file.name);

  return NextResponse.json({
    fileKey: stored.key,
    fileName: file.name,
    fileSize: file.size,
  });
}