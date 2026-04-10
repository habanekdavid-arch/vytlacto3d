import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Nikdy nepresmerovávaj Stripe webhook ani verejné API routy
  if (
    pathname.startsWith("/api/stripe/webhook") ||
    pathname.startsWith("/api/stripe/create-checkout-session") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/analyze") ||
    pathname.startsWith("/api/quote") ||
    pathname.startsWith("/api/upload") ||
    pathname.startsWith("/api/blob") ||
    pathname.startsWith("/api/file") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  const isProtectedRoute =
    pathname.startsWith("/ucet") || pathname.startsWith("/admin");

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/prihlasenie", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};