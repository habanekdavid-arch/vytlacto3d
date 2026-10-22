import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminSession, sessionEmail } from "@/lib/admin-auth";
import { getProduct } from "@/content/produkty";
import { ensureProductImageTable } from "@/lib/product-images";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Obrázok musí byť z nášho úložiska — next/image iné adresy nezobrazí.
function isBlobUrl(value: unknown): value is string {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

function refresh(slug: string) {
  revalidatePath("/produkty");
  revalidatePath(`/produkty/${slug}`);
}

/** Nový náhľadový obrázok produktu (už nahratý do Vercel Blob). */
export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const product = getProduct(body?.slug);
  if (!product) return NextResponse.json({ error: "Neznámy produkt." }, { status: 400 });
  if (!isBlobUrl(body?.url)) return NextResponse.json({ error: "Neplatná adresa obrázka." }, { status: 400 });

  await ensureProductImageTable();
  const updatedBy = await sessionEmail();
  await prisma.productImage.upsert({
    where: { slug: product.slug },
    create: { slug: product.slug, url: body.url, updatedBy },
    update: { url: body.url, updatedBy },
  });
  refresh(product.slug);
  return NextResponse.json({ ok: true });
}

/** Späť na pôvodný obrázok z content/produkty.ts. */
export async function DELETE(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const product = getProduct(body?.slug);
  if (!product) return NextResponse.json({ error: "Neznámy produkt." }, { status: 400 });

  await ensureProductImageTable();
  await prisma.productImage.deleteMany({ where: { slug: product.slug } });
  refresh(product.slug);
  return NextResponse.json({ ok: true });
}
