import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API a systémové routy nechaj bez ochrany proxy
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // ADMIN ochrana iba pre povolené emaily
  if (pathname.startsWith("/admin")) {
    if (!token) {
      const loginUrl = new URL("/prihlasenie", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const userEmail = String(token.email ?? "").trim().toLowerCase();
    const adminEmails = getAdminEmails();

    if (!userEmail || !adminEmails.includes(userEmail)) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  }

  // Klientská zóna
  if (pathname.startsWith("/ucet")) {
    if (!token) {
      const loginUrl = new URL("/prihlasenie", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};