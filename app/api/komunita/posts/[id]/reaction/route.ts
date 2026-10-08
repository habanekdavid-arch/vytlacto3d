import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureCommunityTables, getCommunityViewer } from "@/lib/komunita-db";
import { isReactionKey } from "@/lib/komunita";

export const runtime = "nodejs";

/** Nastaví reakciu prihláseného používateľa; type: null ju zruší. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getCommunityViewer();
  if (!viewer) return NextResponse.json({ error: "Na reagovanie sa prihlás." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { type?: unknown } | null;
  const type = body?.type ?? null;
  if (type !== null && !isReactionKey(type)) {
    return NextResponse.json({ error: "Neznáma reakcia." }, { status: 400 });
  }

  await ensureCommunityTables();
  const post = await prisma.communityPost.findUnique({ where: { id }, select: { status: true } });
  if (!post || post.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Príspevok neexistuje." }, { status: 404 });
  }

  const key = { postId_userId: { postId: id, userId: viewer.id } };
  if (type === null) {
    await prisma.communityReaction.deleteMany({ where: { postId: id, userId: viewer.id } });
  } else {
    await prisma.communityReaction.upsert({
      where: key,
      create: { postId: id, userId: viewer.id, type },
      update: { type },
    });
  }
  return NextResponse.json({ ok: true });
}
