import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ensureCommunityTables, getCommunityViewer, reactionCounts } from "@/lib/komunita-db";
import {
  STATUS_LABELS,
  formatCommunityDate,
  isReactionKey,
  publicName,
  type CommunityStatus,
} from "@/lib/komunita";
import { materialLabel } from "@/lib/print-options";
import RealizaciaGallery from "@/components/RealizaciaGallery";
import ReactionBar from "@/components/komunita/ReactionBar";
import CommentSection from "@/components/komunita/CommentSection";
import PostActions from "@/components/komunita/PostActions";
import { VerifiedBadge } from "@/components/komunita/PostCard";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  await ensureCommunityTables();
  const post = await prisma.communityPost.findFirst({ where: { id, status: "PUBLISHED" } });
  if (!post) return { title: "Príspevok nenájdený" };
  const description = post.story.slice(0, 160);
  return {
    title: `${post.title} – Komunita`,
    description,
    openGraph: { title: post.title, description, images: post.images.slice(0, 1) },
  };
}

export default async function KomunitaPostPage({ params }: Params) {
  const { id } = await params;
  await ensureCommunityTables();
  const viewer = await getCommunityViewer();

  const post = await prisma.communityPost.findUnique({
    where: { id },
    include: {
      user: { select: { name: true } },
      comments: {
        where: { hidden: false },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });

  const isOwner = Boolean(viewer && post && post.userId === viewer.id);
  // Neschválený alebo skrytý príspevok vidí len autor a admin.
  if (!post || (post.status !== "PUBLISHED" && !isOwner && !viewer?.isAdmin)) notFound();

  const status = post.status as CommunityStatus;
  const published = status === "PUBLISHED";

  const [counts, mine] = await Promise.all([
    reactionCounts([post.id]).then((m) => m.get(post.id) ?? {}),
    viewer
      ? prisma.communityReaction.findUnique({
          where: { postId_userId: { postId: post.id, userId: viewer.id } },
          select: { type: true },
        })
      : null,
  ]);

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const loginHref = `/prihlasenie?callbackUrl=/komunita/${post.id}`;
  const author = publicName(post.user.name);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href="/komunita"
        className="mb-8 inline-flex rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50"
      >
        ← Späť do komunity
      </Link>

      {!published && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#FFAE00]/40 bg-[#FFAE00]/10 px-5 py-4 text-sm text-neutral-800">
          <span>
            <strong>{STATUS_LABELS[status] ?? status}.</strong>{" "}
            {status === "PENDING"
              ? "Príspevok uvidia ostatní, keď ho skontrolujeme."
              : "Príspevok je skrytý a ostatní ho nevidia."}
          </span>
        </div>
      )}

      <article className="overflow-hidden rounded-[36px] border border-neutral-200 bg-white shadow-sm">
        <div className="relative aspect-[16/10] bg-neutral-100">
          <Image src={post.images[0]} alt={post.title} fill priority sizes="(min-width: 1024px) 1000px, 100vw" className="object-cover" />
          <div className="absolute left-5 top-5 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-900 shadow-sm backdrop-blur">
            {post.category}
          </div>
        </div>

        <div className="p-6 md:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#FFAE00] text-base font-bold text-black">
              {author.charAt(0).toUpperCase()}
            </span>
            <div>
              <div className="flex items-center gap-2 font-semibold text-neutral-900">
                {author}
                {post.orderId && <VerifiedBadge />}
              </div>
              <div className="text-sm text-neutral-500">{formatCommunityDate(post.createdAt)}</div>
            </div>
            {(isOwner || viewer?.isAdmin) && (
              <div className="ml-auto">
                <PostActions postId={post.id} status={status} canDelete isAdmin={Boolean(viewer?.isAdmin)} />
              </div>
            )}
          </div>

          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-neutral-900 md:text-5xl">{post.title}</h1>

          {post.material && (
            <div className="mt-4 inline-flex rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm">
              <span className="font-bold text-neutral-500">Materiál:&nbsp;</span>
              <span className="font-semibold text-neutral-900">{materialLabel(post.material, post.material)}</span>
            </div>
          )}

          <p className="mt-6 whitespace-pre-wrap text-base leading-8 text-neutral-700">{post.story}</p>

          {post.images.length > 1 && (
            <div className="mt-10">
              <RealizaciaGallery images={post.images.slice(1)} title={post.title} />
            </div>
          )}

          {published && (
            <div className="mt-10 border-t border-neutral-100 pt-6">
              <ReactionBar
                postId={post.id}
                counts={counts}
                mine={mine && isReactionKey(mine.type) ? mine.type : null}
                loggedIn={Boolean(viewer)}
                loginHref={loginHref}
              />
            </div>
          )}
        </div>

        <div className="border-t border-neutral-200 bg-neutral-50/50 p-6 md:p-10">
          <CommentSection
            postId={post.id}
            loggedIn={Boolean(viewer)}
            loginHref={loginHref}
            canComment={published}
            comments={post.comments.map((c) => ({
              id: c.id,
              text: c.text,
              author: publicName(c.user.name),
              date: formatCommunityDate(c.createdAt),
              isAuthorOfPost: c.userId === post.userId,
              isTeam: adminEmails.includes(c.user.email.toLowerCase()),
              canDelete: Boolean(viewer && (viewer.id === c.userId || viewer.isAdmin)),
            }))}
          />
        </div>
      </article>

      <section className="mt-12 rounded-[28px] bg-neutral-900 px-6 py-10 text-center text-white md:px-12">
        <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Aj ty máš nápad na výtlačok?</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/70">
          Nahraj STL model, vyber materiál a hneď uvidíš cenu. Potom sa môžeš pochváliť tu v komunite.
        </p>
        <Link
          href="/#kalkulator"
          className="mt-6 inline-flex rounded-2xl bg-[#FFAE00] px-6 py-3 text-sm font-bold text-black transition hover:brightness-95"
        >
          Spočítať cenu tlače
        </Link>
      </section>
    </main>
  );
}
