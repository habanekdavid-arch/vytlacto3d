import { NextRequest, NextResponse } from "next/server";
import { checkCoupon } from "@/lib/coupons";

export const runtime = "nodejs";

/** Overenie kupónu v košíku. Samotná zľava sa aj tak počíta až pri objednávke. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  try {
    const check = await checkCoupon(body?.code);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
    return NextResponse.json({ code: check.code, percent: check.percent });
  } catch (e) {
    console.error("coupon check failed:", e);
    return NextResponse.json({ error: "Kupón sa nepodarilo overiť. Skúste to znova." }, { status: 500 });
  }
}
