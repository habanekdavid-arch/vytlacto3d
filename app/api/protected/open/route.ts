import { NextRequest, NextResponse } from "next/server";
import { del, put } from "@vercel/blob";
import { isOurBlobUrl } from "@/lib/drawing-model";
import { ProtectedFileError, contentTypeFor, isProtectableName, openProtectedFile, safeFileName } from "@/lib/protected-file";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Konfigurátor: otvorí nahratý chránený súbor .v3d. Pôvodný obsah uloží do
 * Blobu a vráti naň odkaz — ďalej sa spracuje ako bežne nahratý súbor.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const url = body?.url;
  if (!isOurBlobUrl(url)) return NextResponse.json({ error: "Neplatný súbor." }, { status: 400 });
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Blob ${res.status}`);
    const { header, data } = openProtectedFile(Buffer.from(await res.arrayBuffer()));
    if (!isProtectableName(header.name)) throw new ProtectedFileError("Chránený súbor má nepodporovaný obsah.");
    const name = safeFileName(header.name);
    const saved = await put(`modely/${name}`, data, {
      access: "public",
      addRandomSuffix: true,
      contentType: contentTypeFor(name),
    });
    await del(url).catch(() => {});
    return NextResponse.json({ ok: true, fileName: name, url: saved.url });
  } catch (e) {
    await del(url).catch(() => {});
    if (e instanceof ProtectedFileError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("protected open failed:", e);
    return NextResponse.json({ error: "Chránený súbor sa nepodarilo otvoriť." }, { status: 500 });
  }
}
