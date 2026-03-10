import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { getLocalFilePath } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const key = req.nextUrl.searchParams.get("key");

    if (!key) {
      return new Response("Missing file key", { status: 400 });
    }

    const filePath = getLocalFilePath(key);

    console.log("FILE API key:", key);
    console.log("FILE API path:", filePath);

    if (!fs.existsSync(filePath)) {
      return new Response(`File not found: ${filePath}`, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return new Response("Invalid file", { status: 400 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath).replace(/"/g, "");

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "model/stl",
        "Content-Length": String(fileBuffer.length),
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("File API error:", err);
    return new Response(`Server error: ${err?.message || "unknown"}`, {
      status: 500,
    });
  }
}