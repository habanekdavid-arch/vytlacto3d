import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureCommunityTables, getCommunityViewer } from "@/lib/komunita-db";

export const runtime = "nodejs";

/** Zmazanie príspevku — autor alebo admin. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getCommunityViewer();
  if (!viewer) return NextResponse.json({ error: "Prihlás sa." }, { status: 401 });

  await ensureCommunityTables();
  const post = await prisma.communityPost.findUnique({ where: { id }, select: { userId: true } });
  if (!post) return NextResponse.json({ error: "Príspevok neexistuje." }, { status: 404 });
  if (post.userId !== viewer.id && !viewer.isAdmin) {
    return NextResponse.json({ error: "Na to nemáš oprávnenie." }, { status: 403 });
  }

  await prisma.communityPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
