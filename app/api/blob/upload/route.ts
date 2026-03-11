import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const lower = pathname.toLowerCase();

        if (!lower.endsWith(".stl")) {
          throw new Error("Podporujeme len STL (.stl).");
        }

        return {
          allowedContentTypes: [
            "model/stl",
            "application/sla",
            "application/octet-stream",
            "application/vnd.ms-pki.stl",
          ],
          maximumSizeInBytes: 1024 * 1024 * 500,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("Blob upload completed:", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}