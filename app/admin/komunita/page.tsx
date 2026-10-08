import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import { ensureCommunityTables } from "@/lib/komunita-db";
import { STATUS_LABELS, formatCommunityDate, type CommunityStatus } from "@/lib/komunita";
import PostActions from "@/components/komunita/PostActions";

export const dynamic = "force-dynamic";

const TABS: CommunityStatus[] = ["PENDING", "PUBLISHED", "HIDDEN"];

export default async function AdminKomunitaPage({
  searchParams,
}: {
  searchParams: Promise<{ stav?: string }>;
}) {
  if (!(await isAdminSession())) redirect("/");
  const { stav } = await searchParams;
  const status: CommunityStatus = TABS.includes(stav as CommunityStatus) ? (stav as CommunityStatus) : "PENDING";

  await ensureCommunityTables();
  const [posts, counts] = await Promise.all([
    prisma.communityPost.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { comments: true, reactions: true } },
      },
    }),
    prisma.communityPost.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-600 shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-[#FFAE00]" />
              Komunita
            </div>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-neutral-900">Moderovanie príspevkov</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Nové príspevky sa zverejnia až po schválení. Komentáre sa zobrazujú hneď — nevhodné zmažete priamo pri príspevku.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/cms" className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50">
              ← CMS
            </Link>
            <Link href="/komunita" className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50">
              Zobraziť na webe
            </Link>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Link
              key={t}
              href={`/admin/komunita?stav=${t}`}
              className={[
                "rounded-full border px-4 py-2 text-sm font-semibold transition",
                t === status ? "border-[#FFAE00] bg-[#FFAE00] text-black" : "border-neutral-200 bg-white text-neutral-700 hover:border-[#FFAE00]",
              ].join(" ")}
            >
              {STATUS_LABELS[t]} ({countOf(t)})
            </Link>
          ))}
        </div>

        {posts.length ? (
          <ul className="space-y-4">
            {posts.map((p) => (
              <li key={p.id} className="flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row">
                <Link href={`/komunita/${p.id}`} className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-2xl bg-neutral-100 sm:w-48">
                  <Image src={p.images[0]} alt={p.title} fill sizes="200px" className="object-cover" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    <span className="font-bold text-neutral-700">{p.category}</span>·
                    <span>{formatCommunityDate(p.createdAt)}</span>·
                    <span>
                      {p.user.name} ({p.user.email})
                    </span>
                    {p.orderId && (
                      <Link href={`/admin/orders/${p.orderId}`} className="font-semibold text-emerald-700 underline">
                        objednávka
                      </Link>
                    )}
                  </div>
                  <Link href={`/komunita/${p.id}`} className="mt-1 block text-lg font-extrabold text-neutral-900 hover:underline">
                    {p.title}
                  </Link>
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-neutral-600">{p.story}</p>
                  <div className="mt-2 text-xs text-neutral-500">
                    📷 {p.images.length} · 💬 {p._count.comments} · reakcie {p._count.reactions}
                  </div>
                  <div className="mt-3">
                    <PostActions postId={p.id} status={p.status as CommunityStatus} canDelete isAdmin afterDelete={null} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-3xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center text-sm text-neutral-500">
            Žiadne príspevky v tomto stave.
          </p>
        )}
      </div>
    </main>
  );
}
