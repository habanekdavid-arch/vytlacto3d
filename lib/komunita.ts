/**
 * Komunita — spoločné pravidlá pre prehliadač aj server (bez prístupu k DB).
 * Zákazníci tu ukazujú, ako ich výtlačky vyzerajú v praxi; ostatní reagujú
 * a komentujú.
 */

export const COMMUNITY_CATEGORIES = [
  "Domácnosť",
  "Náhradný diel",
  "Hobby a modelárstvo",
  "Darček a dekorácia",
  "Firma a prototyp",
  "Iné",
] as const;

export const COMMUNITY_REACTIONS = [
  { key: "like", emoji: "👍", label: "Páči sa mi" },
  { key: "love", emoji: "❤️", label: "Super" },
  { key: "wow", emoji: "🤯", label: "Wow" },
  { key: "useful", emoji: "🛠️", label: "Užitočné" },
] as const;

export type ReactionKey = (typeof COMMUNITY_REACTIONS)[number]["key"];

export const COMMUNITY_MAX_IMAGES = 6;
export const COMMUNITY_MAX_IMAGE_MB = 15;
export const COMMUNITY_TITLE_MAX = 120;
export const COMMUNITY_STORY_MIN = 20;
export const COMMUNITY_STORY_MAX = 3000;
export const COMMUNITY_COMMENT_MAX = 1000;
export const COMMUNITY_BLOB_PREFIX = "komunita/";

export type CommunityStatus = "PENDING" | "PUBLISHED" | "HIDDEN";

export const STATUS_LABELS: Record<CommunityStatus, string> = {
  PENDING: "Čaká na schválenie",
  PUBLISHED: "Zverejnený",
  HIDDEN: "Skrytý",
};

export function isReactionKey(value: unknown): value is ReactionKey {
  return COMMUNITY_REACTIONS.some((r) => r.key === value);
}

export function isCommunityCategory(value: unknown): value is (typeof COMMUNITY_CATEGORIES)[number] {
  return COMMUNITY_CATEGORIES.includes(value as (typeof COMMUNITY_CATEGORIES)[number]);
}

/** Fotky príspevku musia byť nahrané cez náš upload (Vercel Blob, komunita/). */
export function isCommunityImageUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".public.blob.vercel-storage.com") &&
      url.pathname.startsWith(`/${COMMUNITY_BLOB_PREFIX}`)
    );
  } catch {
    return false;
  }
}

/** Verejne sa ukazuje len krstné meno a začiatočné písmeno priezviska. */
export function publicName(name: string | null | undefined): string {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Zákazník";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

export function formatCommunityDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
