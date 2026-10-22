import { PRODUCTS, type Product } from "@/content/produkty";
import { prisma } from "@/lib/prisma";

let tableReady: Promise<void> | null = null;

/** Tabuľka je v migrácii 20261022000000_add_product_image; založí sa aj sama. */
export function ensureProductImageTable() {
  tableReady ??= (async () => {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "ProductImage" (
      "slug" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedBy" TEXT,
      CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("slug")
    )`);
  })().catch((e) => {
    tableReady = null;
    throw e;
  });
  return tableReady;
}

/** Obrázky nahraté v administrácii podľa produktu. Pri chybe databázy prázdne — web ukáže pôvodné. */
export async function getProductImageOverrides(): Promise<Record<string, string>> {
  try {
    await ensureProductImageTable();
    const rows = await prisma.productImage.findMany();
    return Object.fromEntries(rows.map((r) => [r.slug, r.url]));
  } catch (e) {
    console.error("PRODUCT IMAGES ERROR:", e);
    return {};
  }
}

/** Produkty s obrázkami z administrácie (kde nejaký je). */
export async function getProductsWithImages(): Promise<Product[]> {
  const overrides = await getProductImageOverrides();
  return PRODUCTS.map((p) => (overrides[p.slug] ? { ...p, image: overrides[p.slug] } : p));
}
