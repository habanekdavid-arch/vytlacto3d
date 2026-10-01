import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Posledné príspevky z Instagramu @vytlacto3d cez oficiálne Instagram API
 * (Instagram Login). Iba čítanie — web na Instagrame nič nemení.
 *
 * Token z Vercelu (INSTAGRAM_ACCESS_TOKEN) platí 60 dní. Web ho raz za týždeň
 * sám obnoví a nový uloží do tabuľky InstagramToken, takže ho netreba meniť.
 */

const API_URL = "https://graph.instagram.com";
const PROFILE_URL = "https://www.instagram.com/vytlacto3d/";
const MEDIA_FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
const PROFILE_FIELDS = "username,profile_picture_url,followers_count,media_count";
const FEED_LIMIT = 12;
const CACHE_MS = 15 * 60_000;
// Obnovený token platí 60 dní; obnovujeme ho priebežne, nie na poslednú chvíľu.
const REFRESH_AFTER_MS = 7 * 24 * 60 * 60_000;
// Neúspešný pokus o obnovu (napr. token mladší ako 24 h) sa neopakuje častejšie.
const REFRESH_RETRY_MS = 6 * 60 * 60_000;
const TOKEN_ROW_ID = "main";

export type InstagramPost = {
  id: string;
  caption: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  imageUrl: string;
  videoUrl: string | null;
  permalink: string;
  timestamp: string;
};

export type InstagramProfile = {
  username: string;
  profilePictureUrl: string | null;
  followersCount: number | null;
  mediaCount: number | null;
};

export type InstagramFeed = {
  profileUrl: string;
  profile: InstagramProfile | null;
  posts: InstagramPost[];
};

const ENSURE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS "InstagramToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InstagramToken_pkey" PRIMARY KEY ("id")
)`;

let tableReady: Promise<void> | null = null;

function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = prisma.$executeRawUnsafe(ENSURE_TABLE_SQL).then(
      () => undefined,
      (e) => {
        tableReady = null;
        throw e;
      }
    );
  }
  return tableReady;
}

function envToken() {
  return process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || null;
}

export function isInstagramConfigured() {
  return envToken() !== null;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

type ActiveToken = { token: string; sourceHash: string; refreshedAt: Date | null; source: "env" | "refreshed" };

/** Obnovený token z DB, pokiaľ vznikol z aktuálneho tokenu vo Verceli; inak token z Vercelu. */
async function getActiveToken(): Promise<ActiveToken | null> {
  const fromEnv = envToken();
  if (!fromEnv) return null;
  const sourceHash = hashToken(fromEnv);
  try {
    await ensureTable();
    const row = await prisma.instagramToken.findUnique({ where: { id: TOKEN_ROW_ID } });
    if (row && row.sourceHash === sourceHash) {
      return { token: row.token, sourceHash, refreshedAt: row.refreshedAt, source: "refreshed" };
    }
  } catch (e) {
    console.error("Instagram token store unavailable:", e);
  }
  return { token: fromEnv, sourceHash, refreshedAt: null, source: "env" };
}

let lastRefreshAttempt = 0;

/** Predĺži platnosť tokenu o 60 dní. Volá sa na pozadí, nanajvýš raz za čas. */
export async function refreshInstagramTokenIfDue(): Promise<void> {
  const active = await getActiveToken();
  if (!active) return;
  const now = Date.now();
  if (active.refreshedAt && now - active.refreshedAt.getTime() < REFRESH_AFTER_MS) return;
  if (now - lastRefreshAttempt < REFRESH_RETRY_MS) return;
  lastRefreshAttempt = now;

  const url = `${API_URL}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(active.token)}`;
  const res = await fetch(url, { cache: "no-store" });
  const body = await res.json().catch(() => null);
  const token = typeof body?.access_token === "string" ? body.access_token : null;
  if (!res.ok || !token) {
    console.warn("Instagram token refresh skipped:", res.status, describeApiError(body));
    return;
  }
  await ensureTable();
  await prisma.instagramToken.upsert({
    where: { id: TOKEN_ROW_ID },
    create: { id: TOKEN_ROW_ID, token, sourceHash: active.sourceHash, refreshedAt: new Date() },
    update: { token, sourceHash: active.sourceHash, refreshedAt: new Date() },
  });
  console.log("Instagram token refreshed.");
}

type ApiErrorBody = { error?: { message?: string; code?: number } } | null;

function describeApiError(body: ApiErrorBody): string {
  const err = body?.error;
  if (!err) return "neznáma chyba";
  return [err.message, err.code ? `kód ${err.code}` : null].filter(Boolean).join(" — ");
}

class InstagramApiError extends Error {}

async function apiGet<T>(path: string, token: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${API_URL}${path}${sep}access_token=${encodeURIComponent(token)}`, { cache: "no-store" });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new InstagramApiError(`Instagram API ${res.status}: ${describeApiError(body)}`);
  return body as T;
}

type RawMedia = {
  id?: unknown;
  caption?: unknown;
  media_type?: unknown;
  media_url?: unknown;
  thumbnail_url?: unknown;
  permalink?: unknown;
  timestamp?: unknown;
};

type RawProfile = {
  username?: unknown;
  profile_picture_url?: unknown;
  followers_count?: unknown;
  media_count?: unknown;
};

function toPost(m: RawMedia): InstagramPost | null {
  const mediaType = m?.media_type;
  if (mediaType !== "IMAGE" && mediaType !== "VIDEO" && mediaType !== "CAROUSEL_ALBUM") return null;
  const isVideo = mediaType === "VIDEO";
  // Pri videu je media_url samotné video, náhľadový obrázok je v thumbnail_url.
  const imageUrl = isVideo ? m.thumbnail_url : m.media_url;
  if (typeof imageUrl !== "string" || typeof m.permalink !== "string") return null;
  return {
    id: String(m.id),
    caption: typeof m.caption === "string" ? m.caption : "",
    mediaType,
    imageUrl,
    videoUrl: isVideo && typeof m.media_url === "string" ? m.media_url : null,
    permalink: m.permalink,
    timestamp: typeof m.timestamp === "string" ? m.timestamp : "",
  };
}

function toProfile(p: RawProfile | null): InstagramProfile | null {
  if (typeof p?.username !== "string") return null;
  return {
    username: p.username,
    profilePictureUrl: typeof p.profile_picture_url === "string" ? p.profile_picture_url : null,
    followersCount: typeof p.followers_count === "number" ? p.followers_count : null,
    mediaCount: typeof p.media_count === "number" ? p.media_count : null,
  };
}

async function loadFeed(token: string): Promise<InstagramFeed> {
  const [media, profile] = await Promise.all([
    apiGet<{ data?: RawMedia[] }>(`/me/media?fields=${MEDIA_FIELDS}&limit=${FEED_LIMIT}`, token),
    // Profil je len doplnok — keď ho API nevráti, príspevky sa zobrazia aj tak.
    apiGet<RawProfile>(`/me?fields=${PROFILE_FIELDS}`, token).catch((e: unknown) => {
      console.warn("Instagram profile unavailable:", e instanceof Error ? e.message : e);
      return null;
    }),
  ]);
  const posts = (Array.isArray(media?.data) ? media.data : [])
    .map(toPost)
    .filter((p): p is InstagramPost => p !== null);
  return { profileUrl: PROFILE_URL, profile: toProfile(profile), posts };
}

const EMPTY_FEED: InstagramFeed = { profileUrl: PROFILE_URL, profile: null, posts: [] };
let feedCache: { feed: InstagramFeed; at: number } | null = null;

/** Príspevky pre web. Pri chybe vráti posledné úspešne načítané alebo prázdny zoznam. */
export async function getInstagramFeed(): Promise<InstagramFeed> {
  if (feedCache && Date.now() - feedCache.at < CACHE_MS) return feedCache.feed;
  const active = await getActiveToken();
  if (!active) return EMPTY_FEED;
  try {
    const feed = await loadFeed(active.token);
    feedCache = { feed, at: Date.now() };
    return feed;
  } catch (e) {
    console.error("Instagram feed failed:", e);
    return feedCache?.feed ?? EMPTY_FEED;
  }
}

export type InstagramStatus =
  | { configured: false }
  | {
      configured: true;
      ok: boolean;
      error: string | null;
      username: string | null;
      followersCount: number | null;
      postCount: number;
      tokenSource: "env" | "refreshed";
      tokenRefreshedAt: string | null;
    };

/** Stav pre administráciu — vždy načíta naživo, bez cache. */
export async function getInstagramStatus(): Promise<InstagramStatus> {
  const active = await getActiveToken();
  if (!active) return { configured: false };
  const base = {
    configured: true as const,
    tokenSource: active.source,
    tokenRefreshedAt: active.refreshedAt?.toISOString() ?? null,
  };
  try {
    const feed = await loadFeed(active.token);
    feedCache = { feed, at: Date.now() };
    return {
      ...base,
      ok: true,
      error: null,
      username: feed.profile?.username ?? null,
      followersCount: feed.profile?.followersCount ?? null,
      postCount: feed.posts.length,
    };
  } catch (e) {
    return { ...base, ok: false, error: e instanceof Error ? e.message : "Neznáma chyba", username: null, followersCount: null, postCount: 0 };
  }
}
