import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import {
  CONTACT_BLOB_PREFIX,
  CONTACT_MAX_FILE_MB,
  isAllowedContactFile,
} from "@/lib/contact-attachments";

export const runtime = "nodejs";

/**
 * Token na nahratie prílohy z kontaktného formulára priamo do Vercel Blob.
 * Samostatná route, aby sa nerozširovalo, čo smie prijať upload 3D modelov.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(CONTACT_BLOB_PREFIX) || pathname.includes("..") || !isAllowedContactFile(pathname)) {
          throw new Error("Nepodporovaný typ súboru.");
        }
        return {
          // Prehliadače posielajú pre 3D a CAD súbory rôzne (alebo žiadne)
          // typy; o povolení rozhoduje prípona vyššie.
          allowedContentTypes: ["image/*", "application/*", "text/*", "model/*"],
          maximumSizeInBytes: CONTACT_MAX_FILE_MB * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Contact attachment token error:", error);
    return NextResponse.json({ error: "Súbor sa nepodarilo nahrať." }, { status: 400 });
  }
}
