import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import { ensureCommunityTables } from "@/lib/komunita-db";

export const runtime = "nodejs";

const STATUSES = new Set(["PENDING", "PUBLISHED", "HIDDEN"]);

/** Moderácia: schválenie / skrytie príspevku. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { status?: unknown } | null;
  const status = String(body?.status ?? "");
  if (!STATUSES.has(status)) return NextResponse.json({ error: "Neplatný stav." }, { status: 400 });

  await ensureCommunityTables();
  const updated = await prisma.communityPost.updateMany({ where: { id }, data: { status } });
  if (!updated.count) return NextResponse.json({ error: "Príspevok neexistuje." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
