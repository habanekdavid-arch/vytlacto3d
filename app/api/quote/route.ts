import { NextRequest, NextResponse } from "next/server";
import { quote } from "@/lib/pricing";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body?.volumeCm3) {
    return NextResponse.json({ error: "Chýba volumeCm3." }, { status: 400 });
  }

  try {
    const out = quote({
      volumeCm3: Number(body.volumeCm3),
      material: body.material,
      quality: body.quality,
      infillPct: Number(body.infillPct ?? 20),
      quantity: Number(body.quantity ?? 1),
    });

    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Quote failed" },
      { status: 500 }
    );
  }
}