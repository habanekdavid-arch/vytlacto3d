import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureCommunityTables, getCommunityViewer } from "@/lib/komunita-db";

export const runtime = "nodejs";

/** Zmazanie komentára — autor alebo admin. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getCommunityViewer();
  if (!viewer) return NextResponse.json({ error: "Prihlás sa." }, { status: 401 });

  await ensureCommunityTables();
  const comment = await prisma.communityComment.findUnique({ where: { id }, select: { userId: true } });
  if (!comment) return NextResponse.json({ error: "Komentár neexistuje." }, { status: 404 });
  if (comment.userId !== viewer.id && !viewer.isAdmin) {
    return NextResponse.json({ error: "Na to nemáš oprávnenie." }, { status: 403 });
  }

  await prisma.communityComment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
