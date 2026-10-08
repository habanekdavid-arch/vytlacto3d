"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { COMMUNITY_COMMENT_MAX } from "@/lib/komunita";

export type CommunityCommentView = {
  id: string;
  text: string;
  author: string;
  date: string;
  isAuthorOfPost: boolean;
  isTeam: boolean;
  canDelete: boolean;
};

export default function CommentSection({
  postId,
  comments,
  loggedIn,
  loginHref,
  canComment,
}: {
  postId: string;
  comments: CommunityCommentView[];
  loggedIn: boolean;
  loginHref: string;
  canComment: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/komunita/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Komentár sa nepodarilo odoslať.");
      setText("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Komentár sa nepodarilo odoslať.");
    } finally {
      setSending(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Naozaj zmazať komentár?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/komunita/comments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("Komentár sa nepodarilo zmazať.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <section>
      <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900">
        Komentáre <span className="text-neutral-400">{comments.length}</span>
      </h2>

      {canComment &&
        (loggedIn ? (
          <form onSubmit={submit} className="mt-5">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={COMMUNITY_COMMENT_MAX}
              rows={3}
              placeholder="Napíš, čo si o tom myslíš, alebo sa opýtaj na detaily…"
              className="w-full resize-y rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#FFAE00] focus:ring-4 focus:ring-[#FFAE00]/20"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-xs text-neutral-400">
                {text.length}/{COMMUNITY_COMMENT_MAX}
              </span>
              <button
                type="submit"
                disabled={sending || !text.trim()}
                className="rounded-2xl bg-[#FFAE00] px-5 py-2.5 text-sm font-bold text-black shadow-sm transition hover:brightness-95 disabled:opacity-50"
              >
                {sending ? "Odosielam…" : "Pridať komentár"}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-600">
            <Link href={loginHref} className="font-bold text-neutral-900 underline decoration-[#FFAE00] decoration-2 underline-offset-4">
              Prihlás sa
            </Link>{" "}
            a pridaj komentár.
          </div>
        ))}

      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}

      <ul className="mt-6 space-y-4">
        {comments.map((c) => (
          <li key={c.id} className="flex gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-700">
              {c.author.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1 rounded-2xl bg-neutral-50 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-neutral-900">{c.author}</span>
                {c.isTeam && (
                  <span className="rounded-full bg-[#FFAE00]/20 px-2 py-0.5 text-[11px] font-bold text-neutral-900">
                    VytlačTo3D
                  </span>
                )}
                {c.isAuthorOfPost && !c.isTeam && <AuthorBadge />}
                <span className="text-xs text-neutral-400">{c.date}</span>
                {c.canDelete && (
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    disabled={deleting === c.id}
                    className="ml-auto text-xs font-semibold text-neutral-400 transition hover:text-red-600"
                  >
                    Zmazať
                  </button>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-700">{c.text}</p>
            </div>
          </li>
        ))}
      </ul>

      {!comments.length && canComment && (
        <p className="mt-4 text-sm text-neutral-500">Zatiaľ bez komentárov. Začni debatu ako prvý.</p>
      )}
    </section>
  );
}

function AuthorBadge() {
  return (
    <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-bold text-neutral-700">Autor</span>
  );
}
