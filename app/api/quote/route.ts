import { NextRequest, NextResponse } from "next/server";
import { quote } from "@/lib/pricing";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const result = quote({
      volumeCm3: Number(body.volumeCm3),
      material: body.material,
      quality: body.quality,
      infillPct: Number(body.infillPct),
      quantity: Number(body.quantity ?? 1),
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Quote failed" },
      { status: 400 }
    );
  }
}