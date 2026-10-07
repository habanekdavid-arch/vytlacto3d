import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { instagramAuthorizeUrl, isInstagramLoginConfigured } from "@/lib/instagram";

export const runtime = "nodejs";

const STATE_COOKIE = "ig_oauth_state";

/** Presmeruje admina na prihlásenie do Instagramu (tlačidlo „Pripojiť Instagram“). */
export async function GET(req: Request) {
  if (!(await isAdminSession())) return NextResponse.redirect(new URL("/prihlasenie", req.url));
  if (!isInstagramLoginConfigured()) {
    return NextResponse.redirect(new URL("/admin/cms?instagram=error&msg=missing-app", req.url));
  }
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(instagramAuthorizeUrl(state));
  // Overí, že návrat z Instagramu patrí k tomuto prihláseniu (ochrana proti CSRF).
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/admin/instagram",
    maxAge: 600,
  });
  return res;
}
