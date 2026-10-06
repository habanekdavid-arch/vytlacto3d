import { NextRequest, NextResponse } from "next/server";
import { isMaterial, isQuality, quote } from "@/lib/pricing";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const volumeCm3 = Number(body?.volumeCm3);
    const material = body?.material;
    const quality = body?.quality;
    const infillPct = Number(body?.infillPct);
    const quantity = Number(body?.quantity);
    const materialFlexible = Boolean(body?.materialFlexible);
    const colorFlexible = Boolean(body?.colorFlexible);
    // Voliteľná geometria (už v zvolenej mierke). Chýbajúca alebo neplatná
    // hodnota = odhad v quote(), nie chyba — staršie položky ju nemajú.
    const optionalNumber = (v: unknown) => {
      const n = Number(v);
      return v !== undefined && v !== null && Number.isFinite(n) && n >= 0 ? n : undefined;
    };
    const surfaceAreaCm2 = optionalNumber(body?.surfaceAreaCm2);
    const supportCm3 = optionalNumber(body?.supportCm3);
    const heightMm = optionalNumber(body?.heightMm);

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

    // Neznáma hodnota vyzdvihne z cenníka `undefined`, celý výpočet vyjde NaN
    // a odpoveď by s kódom 200 niesla `total: null`.
    if (!isMaterial(material)) {
      return NextResponse.json({ error: "Invalid material" }, { status: 400 });
    }

    if (!isQuality(quality)) {
      return NextResponse.json({ error: "Invalid quality" }, { status: 400 });
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
      surfaceAreaCm2,
      supportCm3,
      heightMm,
      material,
      quality,
      infillPct,
      quantity,
      materialFlexible,
      colorFlexible,
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