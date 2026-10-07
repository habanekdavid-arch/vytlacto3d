import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { connectInstagramWithCode } from "@/lib/instagram";

export const runtime = "nodejs";

const STATE_COOKIE = "ig_oauth_state";

/** Návrat z prihlásenia do Instagramu — vymení kód za token a uloží ho. */
export async function GET(req: NextRequest) {
  const back = (params: Record<string, string>) => {
    const url = new URL("/admin/cms", req.url);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = NextResponse.redirect(url);
    res.cookies.set(STATE_COOKIE, "", { path: "/api/admin/instagram", maxAge: 0 });
    return res;
  };

  if (!(await isAdminSession())) return NextResponse.redirect(new URL("/prihlasenie", req.url));

  const q = req.nextUrl.searchParams;
  if (q.get("error")) {
    return back({ instagram: "error", msg: q.get("error_description") || q.get("error_reason") || q.get("error") || "" });
  }
  const code = q.get("code");
  const state = q.get("state");
  const expected = req.cookies.get(STATE_COOKIE)?.value;
  if (!code || !state || !expected || state !== expected) {
    return back({ instagram: "error", msg: "Prihlásenie vypršalo alebo nesedí. Skúste to znova." });
  }

  try {
    const { username } = await connectInstagramWithCode(code);
    return back({ instagram: "connected", account: username ?? "" });
  } catch (e) {
    console.error("Instagram connect failed:", e);
    return back({ instagram: "error", msg: e instanceof Error ? e.message : "Neznáma chyba" });
  }
}
