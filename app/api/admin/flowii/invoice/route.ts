import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { createFlowiiInvoice, getFlowiiInvoice } from "@/lib/flowii/invoice";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Admin: stav faktúry vo FLOWii k objednávke. */
export async function GET(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Nemáte prístup." }, { status: 403 });
  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "Chýba objednávka." }, { status: 400 });
  return NextResponse.json({ row: await getFlowiiInvoice(orderId) });
}

/** Admin: ručné vystavenie (alebo opakovanie po chybe). Nikdy nevytvorí druhú faktúru. */
export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Nemáte prístup." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (typeof body?.orderId !== "string") return NextResponse.json({ error: "Chýba objednávka." }, { status: 400 });
  try {
    const result = await createFlowiiInvoice(body.orderId, { manual: true, confirmUnknown: body?.confirmUnknown === true });
    return NextResponse.json({ result, row: await getFlowiiInvoice(body.orderId) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error)?.message || "Faktúru sa nepodarilo vystaviť." }, { status: 500 });
  }
}
