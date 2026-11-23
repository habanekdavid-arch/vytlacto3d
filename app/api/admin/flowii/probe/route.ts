import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { probeFlowiiInvoices } from "@/lib/flowii/probe";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Admin: prieskum faktúr vo FLOWii — len čítanie (lib/flowii/probe). */
export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Nemáte prístup." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  try {
    const result = await probeFlowiiInvoices({
      webOrderId: typeof body?.orderId === "string" ? body.orderId : undefined,
      invoiceNumber: typeof body?.invoiceNumber === "string" ? body.invoiceNumber.trim().slice(0, 30) : undefined,
    });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Prieskum zlyhal." }, { status: 500 });
  }
}
