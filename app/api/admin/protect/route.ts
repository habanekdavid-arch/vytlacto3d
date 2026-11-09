import { NextRequest, NextResponse } from "next/server";
import { del, put } from "@vercel/blob";
import { isAdminSession, sessionEmail } from "@/lib/admin-auth";
import { isOurBlobUrl } from "@/lib/drawing-model";
import {
  PROTECTED_EXT,
  ProtectedFileError,
  isProtectableName,
  protectFile,
  safeFileName,
  sanitizeConfig,
} from "@/lib/protected-file";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Súbor na zamknutie: Blob, alebo hotový model z katalógu (cesta na webe). */
function sourceUrl(req: NextRequest, url: unknown): string | null {
  if (isOurBlobUrl(url)) return url;
  if (typeof url === "string" && /^\/[A-Za-z0-9/_.-]+$/.test(url) && !url.includes("..")) {
    return new URL(url, req.nextUrl.origin).toString();
  }
  return null;
}

/**
 * Admin: zamkne súbor do .v3d a vráti odkaz na stiahnutie.
 * - Admin → Chránené súbory: dočasne nahratý súbor (na-zamknutie/) sa potom zmaže.
 * - Konfigurátor (export položky): model ostáva, .v3d si nesie aj nastavenie
 *   (config) — po nahratí sa model vloží s rovnakými parametrami.
 */
export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Nemáte prístup." }, { status: 403 });
  const body = await req.json().catch(() => null);
  const url = sourceUrl(req, body?.url);
  const name = String(body?.fileName ?? "");
  const temporary = isOurBlobUrl(body?.url) && new URL(body.url).pathname.includes("/na-zamknutie/");
  if (!url) return NextResponse.json({ error: "Neplatný súbor." }, { status: 400 });
  if (!isProtectableName(name)) {
    if (temporary) await del(body.url).catch(() => {});
    return NextResponse.json({ error: "Podporujeme STL, OBJ, SVG, PNG, JPG a WEBP." }, { status: 400 });
  }
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Súbor ${res.status}`);
    const data = Buffer.from(await res.arrayBuffer());
    const locked = protectFile(data, {
      name,
      type: res.headers.get("content-type") ?? "",
      createdAt: new Date().toISOString(),
      createdBy: await sessionEmail(),
      config: sanitizeConfig(body?.config),
    });
    const outName = safeFileName(name.replace(/\.[^.]+$/, "")) + PROTECTED_EXT;
    const saved = await put(`chranene/${outName}`, locked, {
      access: "public",
      addRandomSuffix: true,
      contentType: "application/octet-stream",
    });
    if (temporary) await del(body.url).catch(() => {});
    return NextResponse.json({ ok: true, fileName: outName, downloadUrl: saved.downloadUrl, size: locked.length, originalSize: data.length });
  } catch (e) {
    if (e instanceof ProtectedFileError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("protect failed:", e);
    return NextResponse.json({ error: "Súbor sa nepodarilo zamknúť." }, { status: 500 });
  }
}
