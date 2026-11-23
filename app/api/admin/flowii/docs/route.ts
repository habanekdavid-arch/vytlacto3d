import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Dočasné: stiahne verejnú dokumentáciu FLOWii API (apiary blueprint) zo
 * servera — z vývojového prostredia nie je dostupná. Len pevné verejné
 * adresy, žiadny vstup od používateľa, nič sa neodosiela.
 */
const SOURCES = [
  "https://jsapi.apiary.io/apis/flowiiapi.apib",
  "https://flowiiapi.docs.apiary.io/api-description-document",
  "https://jsapi.apiary.io/apis/flowiiapi.source",
  "https://flowiiapi.docs.apiary.io/",
];

export async function GET() {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Nemáte prístup." }, { status: 403 });
  const tried: string[] = [];
  for (const url of SOURCES) {
    try {
      const res = await fetch(url, { cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(15000) });
      const text = await res.text();
      tried.push(`${url} → ${res.status} (${text.length} B)`);
      if (res.ok && text.length > 500) {
        return new NextResponse(text, {
          headers: { "content-type": "text/plain; charset=utf-8", "content-disposition": 'attachment; filename="flowii-api.txt"', "x-source": url, "cache-control": "no-store" },
        });
      }
    } catch (e) {
      tried.push(`${url} → ${(e as Error).message}`);
    }
  }
  return NextResponse.json({ error: "Dokumentácia nedostupná.", tried }, { status: 502 });
}
