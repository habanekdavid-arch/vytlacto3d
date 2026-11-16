import { NextRequest, NextResponse } from "next/server";
import { retryWaitingFlowiiSyncs } from "@/lib/flowii/sync";

export const dynamic = "force-dynamic";
// Pri minútovom limite FLOWii sa čaká ~1 min na pokus.
export const maxDuration = 300;

/**
 * Ráno dokončí prenosy do FLOWii odložené pre vyčerpaný denný limit
 * (vercel.json). Zakladá len nové zákazky, nič existujúce nemení.
 */
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const report = await retryWaitingFlowiiSyncs();
  console.log("FLOWii retry cron:", JSON.stringify(report));
  return NextResponse.json(report);
}
