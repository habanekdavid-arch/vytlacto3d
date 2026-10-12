import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { checkPacketaConnection, describePacketaPassword } from "@/lib/packeta/client";

export const runtime = "nodejs";

/** Diagnostika napojenia na Packetu — heslo sa nikdy nevracia celé. */
export async function GET() {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const password = describePacketaPassword();
  const connection = password.set ? await checkPacketaConnection() : { ok: false, message: "Heslo nie je nastavené." };
  return NextResponse.json({ password, connection });
}
