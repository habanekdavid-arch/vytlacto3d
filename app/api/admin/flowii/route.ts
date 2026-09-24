import { NextRequest, NextResponse } from "next/server";
import { getSafeServerSession } from "@/lib/session";
import { checkFlowiiConnection, syncOrderToFlowii } from "@/lib/flowii/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

async function isAdmin() {
  const session = await getSafeServerSession();
  const email = String((session?.user as { email?: string | null } | undefined)?.email ?? "").toLowerCase();
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(email) && adminEmails.includes(email);
}

/** Test pripojenia — iba čítanie z FLOWii. */
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await checkFlowiiConnection());
}

/** Ručné vytvorenie (alebo dokončenie) zákazky pre jednu objednávku. */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  if (!orderId) return NextResponse.json({ error: "Chýba orderId." }, { status: 400 });

  try {
    const result = await syncOrderToFlowii(orderId, { manual: true });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Prenos do FLOWii zlyhal." }, { status: 502 });
  }
}
