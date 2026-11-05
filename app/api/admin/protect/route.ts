import { NextRequest, NextResponse } from "next/server";
import { del, put } from "@vercel/blob";
import { isAdminSession, sessionEmail } from "@/lib/admin-auth";
import { isOurBlobUrl } from "@/lib/drawing-model";
import { PROTECTED_EXT, ProtectedFileError, isProtectableName, protectFile, safeFileName } from "@/lib/protected-file";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Admin: zamkne nahratý súbor (Blob) do .v3d. Pôvodný súbor sa z Blobu
 * zmaže, vráti sa odkaz na stiahnutie chráneného súboru.
 */
export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Nemáte prístup." }, { status: 403 });
  const body = await req.json().catch(() => null);
  const url = body?.url;
  const name = String(body?.fileName ?? "");
  if (!isOurBlobUrl(url)) return NextResponse.json({ error: "Neplatný súbor." }, { status: 400 });
  if (!isProtectableName(name)) {
    await del(url).catch(() => {});
    return NextResponse.json({ error: "Podporujeme STL, OBJ, SVG, PNG, JPG a WEBP." }, { status: 400 });
  }
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Blob ${res.status}`);
    const data = Buffer.from(await res.arrayBuffer());
    const locked = protectFile(data, { name, type: res.headers.get("content-type") ?? "", createdAt: new Date().toISOString(), createdBy: await sessionEmail() });
    const outName = safeFileName(name.replace(/\.[^.]+$/, "")) + PROTECTED_EXT;
    const saved = await put(`chranene/${outName}`, locked, {
      access: "public",
      addRandomSuffix: true,
      contentType: "application/octet-stream",
    });
    await del(url).catch(() => {});
    return NextResponse.json({ ok: true, fileName: outName, downloadUrl: saved.downloadUrl, size: locked.length, originalSize: data.length });
  } catch (e) {
    if (e instanceof ProtectedFileError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("protect failed:", e);
    return NextResponse.json({ error: "Súbor sa nepodarilo zamknúť." }, { status: 500 });
  }
}
