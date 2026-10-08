import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getSafeServerSession } from "@/lib/session";
import { COMMUNITY_BLOB_PREFIX, COMMUNITY_MAX_IMAGE_MB } from "@/lib/komunita";

export const runtime = "nodejs";

/**
 * Token na nahratie fotky ku komunitnému príspevku priamo do Vercel Blob.
 * Samostatná route — fotky smú nahrávať len prihlásení a len obrázky.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const session = await getSafeServerSession();
        if (!(session?.user as { id?: string } | undefined)?.id) {
          throw new Error("Na pridanie fotiek sa prihlás.");
        }
        if (!pathname.startsWith(COMMUNITY_BLOB_PREFIX) || pathname.includes("..")) {
          throw new Error("Neplatný názov súboru.");
        }
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
          maximumSizeInBytes: COMMUNITY_MAX_IMAGE_MB * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Community upload token error:", error);
    return NextResponse.json({ error: "Fotku sa nepodarilo nahrať." }, { status: 400 });
  }
}
