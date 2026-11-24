import { NextRequest, NextResponse } from "next/server";
import { retryWaitingFlowiiSyncs } from "@/lib/flowii/sync";
import { createMissingFlowiiInvoices } from "@/lib/flowii/invoice";

export const dynamic = "force-dynamic";
// Pri minútovom limite FLOWii sa čaká ~1 min na pokus.
export const maxDuration = 300;

/**
 * Ráno dokončí prenosy do FLOWii odložené pre vyčerpaný denný limit
 * (vercel.json) a vystaví chýbajúce faktúry. Zakladá len nové záznamy,
 * nič existujúce nemení.
 */
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const report = await retryWaitingFlowiiSyncs();
  console.log("FLOWii retry cron:", JSON.stringify(report));
  // Faktúry, ktoré včera nevznikli (napr. pre limit FLOWii) — len nové, nič sa neopakuje.
  const invoices = await createMissingFlowiiInvoices().catch((e) => [String(e?.message ?? e)]);
  console.log("FLOWii invoice cron:", JSON.stringify(invoices));
  return NextResponse.json({ ...report, invoices });
}
