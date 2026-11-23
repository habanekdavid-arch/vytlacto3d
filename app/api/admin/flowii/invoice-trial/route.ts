import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { trialFlowiiInvoice } from "@/lib/flowii/invoice-trial";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Admin: skúšobná faktúra vo FLOWii (lib/flowii/invoice-trial). */
export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Nemáte prístup." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (typeof body?.orderId !== "string" || body?.confirm !== true) {
    return NextResponse.json({ error: "Chýba objednávka alebo potvrdenie." }, { status: 400 });
  }
  try {
    return NextResponse.json(await trialFlowiiInvoice(body.orderId));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Pokus zlyhal." }, { status: 500 });
  }
}
