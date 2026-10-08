import Image from "next/image";
import Link from "next/link";
import { COMMUNITY_REACTIONS, formatCommunityDate } from "@/lib/komunita";

export type CommunityPostCard = {
  id: string;
  title: string;
  story: string;
  cover: string;
  photoCount: number;
  category: string;
  material: string | null;
  author: string;
  verified: boolean;
  createdAt: Date;
  reactions: Record<string, number>;
  commentCount: number;
};

export default function PostCard({ post }: { post: CommunityPostCard }) {
  const totalReactions = Object.values(post.reactions).reduce((a, b) => a + b, 0);
  const topEmojis = COMMUNITY_REACTIONS.filter((r) => post.reactions[r.key])
    .sort((a, b) => (post.reactions[b.key] ?? 0) - (post.reactions[a.key] ?? 0))
    .slice(0, 3)
    .map((r) => r.emoji);

  return (
    <Link
      href={`/komunita/${post.id}`}
      className="group flex flex-col overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-sm transition duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#FFAE00]/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFAE00]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
        <Image
          src={post.cover}
          alt={post.title}
          fill
          sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-900 shadow-sm backdrop-blur">
          {post.category}
        </div>
        {post.photoCount > 1 && (
          <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            📷 {post.photoCount}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-lg font-extrabold leading-snug tracking-tight text-neutral-900">{post.title}</h2>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-neutral-600">{post.story}</p>

        <div className="mt-auto pt-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFAE00] text-sm font-bold text-black">
              {post.author.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 text-sm">
              <div className="flex items-center gap-1.5 font-semibold text-neutral-900">
                <span className="truncate">{post.author}</span>
                {post.verified && <VerifiedBadge compact />}
              </div>
              <div className="text-xs text-neutral-500">{formatCommunityDate(post.createdAt)}</div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-sm text-neutral-500">
            <span>
              {totalReactions > 0 ? (
                <>
                  <span className="mr-1">{topEmojis.join("")}</span>
                  {totalReactions}
                </>
              ) : (
                "Buď prvý, kto zareaguje"
              )}
            </span>
            <span>💬 {post.commentCount}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function VerifiedBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      title="Výtlačok si objednal(a) u nás"
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200"
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 6 9 17l-5-5" />
      </svg>
      {compact ? "Overený" : "Overený zákazník"}
    </span>
  );
}
