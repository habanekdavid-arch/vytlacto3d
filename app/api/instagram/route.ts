import { NextResponse, after } from "next/server";
import { getInstagramFeed, isInstagramConfigured, refreshInstagramTokenIfDue } from "@/lib/instagram";

export const runtime = "nodejs";

/** Verejný zoznam posledných príspevkov z Instagramu pre hlavnú stránku. */
export async function GET() {
  const feed = await getInstagramFeed();

  if (isInstagramConfigured()) {
    after(async () => {
      try {
        await refreshInstagramTokenIfDue();
      } catch (e) {
        console.error("Instagram token refresh failed:", e);
      }
    });
  }

  return NextResponse.json(feed, {
    headers: {
      // CDN Vercelu drží odpoveď hodinu, takže Instagram API sa volá len zriedka.
      "Cache-Control": feed.posts.length
        ? "public, s-maxage=3600, stale-while-revalidate=86400"
        : "public, s-maxage=300",
    },
  });
}
