import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureCommunityTables, getCommunityViewer } from "@/lib/komunita-db";
import { COMMUNITY_COMMENT_MAX } from "@/lib/komunita";

export const runtime = "nodejs";

const MAX_COMMENTS_PER_HOUR = 20;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getCommunityViewer();
  if (!viewer) return NextResponse.json({ error: "Na komentovanie sa prihlás." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  const text = String(body?.text ?? "").trim();
  if (!text || text.length > COMMUNITY_COMMENT_MAX) {
    return NextResponse.json({ error: `Komentár musí mať 1 až ${COMMUNITY_COMMENT_MAX} znakov.` }, { status: 400 });
  }

  await ensureCommunityTables();
  const post = await prisma.communityPost.findUnique({ where: { id }, select: { status: true } });
  if (!post || (post.status !== "PUBLISHED" && !viewer.isAdmin)) {
    return NextResponse.json({ error: "Príspevok neexistuje." }, { status: 404 });
  }

  const recent = await prisma.communityComment.count({
    where: { userId: viewer.id, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recent >= MAX_COMMENTS_PER_HOUR && !viewer.isAdmin) {
    return NextResponse.json({ error: "Príliš veľa komentárov naraz. Skús to o chvíľu." }, { status: 429 });
  }

  const comment = await prisma.communityComment.create({
    data: { postId: id, userId: viewer.id, text },
    select: { id: true },
  });
  return NextResponse.json({ id: comment.id });
}
