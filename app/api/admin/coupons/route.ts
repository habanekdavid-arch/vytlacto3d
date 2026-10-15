import { NextRequest, NextResponse } from "next/server";
import { isAdminSession, sessionEmail } from "@/lib/admin-auth";
import { createCoupon, ensureCouponTable, isCouponPercent, normalizeCouponCode } from "@/lib/coupons";
import { sendCouponEmail } from "@/lib/email-coupon";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Nový jednorazový kupón; s e-mailom sa rovno pošle zákazníkovi. */
export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const percent = Number(body?.percent);
  if (!isCouponPercent(percent)) return NextResponse.json({ error: "Zľava musí byť 5, 10 alebo 20 %." }, { status: 400 });

  const email = String(body?.email ?? "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Neplatný e-mail." }, { status: 400 });
  }

  const coupon = await createCoupon(percent, { email: email || null, createdBy: await sessionEmail() });

  if (email) {
    try {
      await sendCouponEmail({ to: email, name: body?.name ? String(body.name) : null, code: coupon.code, percent });
    } catch (e: any) {
      console.error("Coupon email failed:", e);
      // Kupón, ktorý nikto nedostal, by len visel v zozname.
      await prisma.coupon.delete({ where: { code: coupon.code } }).catch(() => {});
      return NextResponse.json({ error: `E-mail sa nepodarilo odoslať: ${e?.message ?? "neznáma chyba"}` }, { status: 502 });
    }
    await prisma.coupon.update({ where: { code: coupon.code }, data: { sentAt: new Date() } });
  }

  return NextResponse.json({ ok: true, code: coupon.code, percent, sent: Boolean(email) });
}

/** Zrušenie nepoužitého kupónu. */
export async function DELETE(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureCouponTable();
  const code = normalizeCouponCode(req.nextUrl.searchParams.get("code"));
  const res = await prisma.coupon.deleteMany({ where: { code, usedAt: null } });
  if (!res.count) return NextResponse.json({ error: "Kupón neexistuje alebo už bol použitý." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
