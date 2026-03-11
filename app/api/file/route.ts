import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getLocalFilePath } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const key = req.nextUrl.searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "Missing key" }, { status: 400 });
    }

    if (key.startsWith("http://") || key.startsWith("https://")) {
      return NextResponse.redirect(key);
    }

    const filePath = getLocalFilePath(key);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const filename = path.basename(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/vnd.ms-pki.stl",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}