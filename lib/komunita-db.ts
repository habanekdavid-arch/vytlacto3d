import { prisma } from "@/lib/prisma";
import { getSafeServerSession } from "@/lib/session";
import { isAdminSession } from "@/lib/admin-auth";

/**
 * Tabuľky komunity. Rovnaké príkazy sú v migrácii 20261008000000_add_community;
 * aplikácia si ich vie založiť aj sama (ako InstagramToken), aby sekcia
 * fungovala aj pred ručným spustením migrácie. Všetko je idempotentné.
 */
const ENSURE_SQL = [
  `CREATE TABLE IF NOT EXISTS "CommunityPost" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "story" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT NOT NULL,
    "material" TEXT,
    "orderId" TEXT,
    "userId" TEXT NOT NULL,
    CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "CommunityComment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "text" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "CommunityComment_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "CommunityReaction" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "CommunityReaction_pkey" PRIMARY KEY ("postId","userId")
  )`,
  `CREATE INDEX IF NOT EXISTS "CommunityPost_status_createdAt_idx" ON "CommunityPost"("status", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "CommunityPost_userId_idx" ON "CommunityPost"("userId")`,
  `CREATE INDEX IF NOT EXISTS "CommunityComment_postId_createdAt_idx" ON "CommunityComment"("postId", "createdAt")`,
  ...[
    `ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    `ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    `ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    `ALTER TABLE "CommunityReaction" ADD CONSTRAINT "CommunityReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    `ALTER TABLE "CommunityReaction" ADD CONSTRAINT "CommunityReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  ].map((sql) => `DO $$ BEGIN ${sql}; EXCEPTION WHEN duplicate_object THEN NULL; END $$`),
];

let tablesReady: Promise<void> | null = null;

export function ensureCommunityTables(): Promise<void> {
  if (!tablesReady) {
    tablesReady = (async () => {
      for (const sql of ENSURE_SQL) await prisma.$executeRawUnsafe(sql);
    })().catch((e) => {
      tablesReady = null;
      throw e;
    });
  }
  return tablesReady;
}

export type CommunityViewer = {
  id: string;
  name: string;
  isAdmin: boolean;
} | null;

export async function getCommunityViewer(): Promise<CommunityViewer> {
  const session = await getSafeServerSession();
  const user = session?.user as { id?: string; name?: string | null } | undefined;
  if (!user?.id) return null;
  return { id: user.id, name: user.name ?? "", isAdmin: await isAdminSession() };
}

/** Počty reakcií podľa typu pre viac príspevkov naraz. */
export async function reactionCounts(postIds: string[]) {
  const rows = postIds.length
    ? await prisma.communityReaction.groupBy({
        by: ["postId", "type"],
        where: { postId: { in: postIds } },
        _count: { _all: true },
      })
    : [];
  const map = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const entry = map.get(r.postId) ?? {};
    entry[r.type] = r._count._all;
    map.set(r.postId, entry);
  }
  return map;
}
