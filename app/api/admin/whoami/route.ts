import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** Je prihlásený administrátor? (nástroje pre adminov na verejných stránkach) */
export async function GET() {
  const admin = await isAdminSession().catch(() => false);
  return NextResponse.json({ admin }, { headers: { "Cache-Control": "no-store" } });
}
