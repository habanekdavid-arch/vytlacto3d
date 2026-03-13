import { NextRequest, NextResponse } from "next/server";

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Admin Area"',
      "Cache-Control": "no-store",
    },
  });
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const adminUser = process.env.ADMIN_USER;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUser || !adminPassword) {
    return new NextResponse(
      "Missing ADMIN_USER or ADMIN_PASSWORD in environment variables.",
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return unauthorized();
  }

  try {
    const base64Credentials = authHeader.split(" ")[1] || "";
    const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");

    const separatorIndex = credentials.indexOf(":");
    if (separatorIndex === -1) {
      return unauthorized();
    }

    const user = credentials.slice(0, separatorIndex);
    const password = credentials.slice(separatorIndex + 1);

    if (user !== adminUser || password !== adminPassword) {
      return unauthorized();
    }

    return NextResponse.next();
  } catch {
    return unauthorized();
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};