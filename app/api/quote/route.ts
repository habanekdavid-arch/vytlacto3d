import { NextRequest, NextResponse } from "next/server";
import { quote } from "@/lib/pricing";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const volumeCm3 = Number(body?.volumeCm3);
    const material = body?.material;
    const quality = body?.quality;
    const infillPct = Number(body?.infillPct);
    const quantity = Number(body?.quantity);

    if (!Number.isFinite(volumeCm3) || volumeCm3 <= 0) {
      return NextResponse.json(
        { error: "Invalid volumeCm3" },
        { status: 400 }
      );
    }

    if (!material || !quality) {
      return NextResponse.json(
        { error: "Missing material or quality" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(infillPct) || infillPct < 0 || infillPct > 100) {
      return NextResponse.json(
        { error: "Invalid infillPct" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json(
        { error: "Invalid quantity" },
        { status: 400 }
      );
    }

    const result = quote({
      volumeCm3,
      material,
      quality,
      infillPct,
      quantity,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Quote API error:", error);

    return NextResponse.json(
      { error: "Quote failed" },
      { status: 500 }
    );
  }
}