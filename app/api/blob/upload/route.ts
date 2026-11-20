import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { BLOB_ALLOWED_CONTENT_TYPES } from "@/lib/upload-types";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        return {
          // Shared by the customer STL upload flow (UploadBox) and the
          // admin CMS image uploads (blog/realizácie) — both hit this
          // one route, so it needs to accept both kinds of files.
          // Typ určuje klient podľa prípony (lib/upload-types); zoznam obsahuje
          // aj typy, ktoré posielajú prehliadače (Android: vnd.ms-pki.stl).
          allowedContentTypes: BLOB_ALLOWED_CONTENT_TYPES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            pathname,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log("BLOB UPLOADED:", blob, tokenPayload);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("BLOB TOKEN ERROR:", error);
    return NextResponse.json(
      { error: "Failed to generate client token for upload." },
      { status: 400 }
    );
  }
}