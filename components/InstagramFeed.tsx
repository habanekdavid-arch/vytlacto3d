"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { InstagramFeed as Feed, InstagramPost } from "@/lib/instagram";

const PROFILE_URL = "https://www.instagram.com/vytlacto3d/";
const GRID_SIZE = 8;

function InstagramIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.6" cy="6.4" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

function AlbumIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
      <rect x="7" y="7" width="14" height="14" rx="2.5" />
      <path d="M17 3H5.5A2.5 2.5 0 0 0 3 5.5V17" strokeLinecap="round" />
    </svg>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("sk-SK", { day: "numeric", month: "long", year: "numeric" });
}

function formatCount(n: number) {
  return n.toLocaleString("sk-SK");
}

/** Obrázok z Instagram CDN; keď odkaz medzičasom expiruje, ukáže sa farebná náhrada. */
function PostImage({ post, sizes, priority = false }: { post: InstagramPost; sizes: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#FFAE00] via-[#ff7a59] to-[#c13584] text-white">
        <InstagramIcon className="h-10 w-10" />
      </div>
    );
  }
  return (
    <Image
      src={post.imageUrl}
      alt={post.caption ? post.caption.slice(0, 120) : "Príspevok z Instagramu @vytlacto3d"}
      fill
      sizes={sizes}
      priority={priority}
      className="object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function PostPreview({
  feed,
  index,
  onClose,
  onMove,
}: {
  feed: Feed;
  index: number;
  onClose: () => void;
  onMove: (delta: number) => void;
}) {
  const post = feed.posts[index];
  const username = feed.profile?.username ?? "vytlacto3d";
  const avatar = feed.profile?.profilePictureUrl;
  const hasMany = feed.posts.length > 1;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onMove(1);
      if (e.key === "ArrowLeft") onMove(-1);
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, onMove]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Náhľad príspevku z Instagramu"
    >
      {hasMany && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMove(-1);
          }}
          className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white transition hover:bg-white/30 md:flex"
          aria-label="Predchádzajúci príspevok"
        >
          ‹
        </button>
      )}

      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-square w-full shrink-0 bg-neutral-950 md:w-[58%]">
          {post.videoUrl ? (
            <video
              key={post.id}
              src={post.videoUrl}
              poster={post.imageUrl}
              controls
              playsInline
              className="h-full w-full object-contain"
            />
          ) : (
            <PostImage key={post.id} post={post} sizes="(min-width: 768px) 540px, 100vw" priority />
          )}
          {post.mediaType === "CAROUSEL_ALBUM" && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white">
              <AlbumIcon /> Viac fotiek na Instagrame
            </span>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4">
            <div className="rounded-full bg-gradient-to-tr from-[#FFAE00] via-[#ff5f6d] to-[#c13584] p-[2px]">
              <div className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-white bg-neutral-100">
                {avatar ? (
                  <Image src={avatar} alt={`@${username}`} fill sizes="36px" className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs font-extrabold">3D</span>
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-extrabold text-neutral-900">{username}</div>
              {post.timestamp && <div className="text-xs text-neutral-500">{formatDate(post.timestamp)}</div>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition hover:bg-neutral-200"
              aria-label="Zavrieť"
            >
              ×
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-neutral-700">
            {post.caption ? (
              <p className="whitespace-pre-line break-words">{post.caption}</p>
            ) : (
              <p className="text-neutral-400">Tento príspevok je bez popisu — obrázok hovorí za všetko. 😎</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-neutral-100 px-5 py-4">
            <a
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-black"
            >
              <InstagramIcon className="h-4 w-4" /> Otvoriť na Instagrame
            </a>
            {hasMany && (
              <div className="flex gap-2 md:hidden">
                <button
                  type="button"
                  onClick={() => onMove(-1)}
                  className="rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-bold text-neutral-700"
                  aria-label="Predchádzajúci príspevok"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => onMove(1)}
                  className="rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-bold text-neutral-700"
                  aria-label="Ďalší príspevok"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {hasMany && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMove(1);
          }}
          className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white transition hover:bg-white/30 md:flex"
          aria-label="Ďalší príspevok"
        >
          ›
        </button>
      )}
    </div>
  );
}

export default function InstagramFeed() {
  const sectionRef = useRef<HTMLElement>(null);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [failed, setFailed] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Príspevky sa načítajú až keď sa sekcia blíži k obrazovke.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        fetch("/api/instagram")
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
          .then((d: Feed) => {
            if (!cancelled) setFeed(d);
          })
          .catch(() => {
            if (!cancelled) setFailed(true);
          });
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  const posts = feed?.posts.slice(0, GRID_SIZE) ?? [];
  const loading = !feed && !failed;
  const profileUrl = feed?.profileUrl ?? PROFILE_URL;

  const close = useCallback(() => setOpenIndex(null), []);
  const move = useCallback(
    (delta: number) =>
      setOpenIndex((i) => (i === null || posts.length === 0 ? i : (i + delta + posts.length) % posts.length)),
    [posts.length]
  );

  return (
    <section ref={sectionRef} id="instagram" className="relative overflow-hidden bg-white px-6 py-20">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-[#c13584]/10 blur-3xl" />
        <div className="absolute -left-24 bottom-10 h-72 w-72 rounded-full bg-[#FFAE00]/15 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-600 shadow-sm transition hover:border-neutral-300 hover:text-neutral-900"
          >
            <span className="text-[#c13584]">
              <InstagramIcon className="h-4 w-4" />
            </span>
            @{feed?.profile?.username ?? "vytlacto3d"} na Instagrame
          </a>

          <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl">
            Čerstvo z tlačiarne{" "}
            <span className="relative inline-block">
              <span className="relative z-10">vrstva po vrstve</span>
              <span className="absolute inset-x-0 bottom-1 -z-0 h-3 -rotate-1 rounded bg-[#FFAE00]/70 sm:h-4" />
            </span>
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-neutral-600">
            Prototypy, náhradné diely aj vecičky, ktoré jednoducho museli existovať. Nakuknite, čo
            sme vytlačili naposledy — a ak vás niečo inšpiruje, nahrajte svoj model a ideme na to. 🖨️
          </p>

          {feed?.profile && (feed.profile.followersCount !== null || feed.profile.mediaCount !== null) && (
            <div className="mt-5 flex items-center justify-center gap-3 text-sm text-neutral-500">
              {feed.profile.followersCount !== null && (
                <span>
                  <span className="font-extrabold text-neutral-900">{formatCount(feed.profile.followersCount)}</span> sledujúcich
                </span>
              )}
              {feed.profile.followersCount !== null && feed.profile.mediaCount !== null && (
                <span className="h-1 w-1 rounded-full bg-neutral-300" />
              )}
              {feed.profile.mediaCount !== null && (
                <span>
                  <span className="font-extrabold text-neutral-900">{formatCount(feed.profile.mediaCount)}</span> príspevkov
                </span>
              )}
            </div>
          )}
        </div>

        {(loading || posts.length > 0) && (
          <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {loading
              ? Array.from({ length: GRID_SIZE }, (_, i) => (
                  <div
                    key={i}
                    className={`aspect-square animate-pulse rounded-2xl bg-neutral-100 ${i >= 6 ? "hidden md:block" : ""}`}
                  />
                ))
              : posts.map((post, i) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => setOpenIndex(i)}
                    className={`group relative aspect-square overflow-hidden rounded-2xl bg-neutral-100 text-left shadow-sm outline-none ring-[#FFAE00] transition duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:ring-4 ${
                      i >= 6 ? "hidden md:block" : ""
                    }`}
                    aria-label={`Náhľad príspevku: ${post.caption ? post.caption.slice(0, 80) : "bez popisu"}`}
                  >
                    <div className="absolute inset-0 transition duration-500 group-hover:scale-105">
                      <PostImage post={post} sizes="(min-width: 768px) 25vw, 50vw" />
                    </div>

                    {post.mediaType !== "IMAGE" && (
                      <span className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white">
                        {post.mediaType === "VIDEO" ? <PlayIcon /> : <AlbumIcon />}
                      </span>
                    )}

                    <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/25 to-transparent p-4 opacity-0 transition duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                      {post.caption && (
                        <p className="line-clamp-3 text-xs leading-relaxed text-white/90">{post.caption}</p>
                      )}
                      <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#FFAE00]">
                        <InstagramIcon className="h-3.5 w-3.5" /> Pozrieť náhľad
                      </span>
                    </div>
                  </button>
                ))}
          </div>
        )}

        <div className="mt-10 flex flex-col items-center gap-3">
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#FFAE00] via-[#ff5f6d] to-[#c13584] px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#c13584]/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#c13584]/30"
          >
            <InstagramIcon className="h-5 w-5" />
            Sledovať @{feed?.profile?.username ?? "vytlacto3d"}
          </a>
          <span className="text-xs text-neutral-400">Nové kúsky pribúdajú rýchlejšie, ako stihne vychladnúť tryska.</span>
        </div>
      </div>

      {feed && openIndex !== null && posts[openIndex] && (
        <PostPreview feed={{ ...feed, posts }} index={openIndex} onClose={close} onMove={move} />
      )}
    </section>
  );
}
