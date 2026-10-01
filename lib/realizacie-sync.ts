import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { repoRealizacie } from "@/content/realizacie";

/**
 * Vloží do databázy realizácie z content/realizacie.ts, ktoré tam ešte neboli.
 * Každá sa vloží len raz (záznam v RepoContentImport), takže úpravy aj zmazanie
 * v CMS zostanú tak, ako ich admin nechal.
 */

const ENSURE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS "RepoContentImport" (
    "key" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepoContentImport_pkey" PRIMARY KEY ("key")
)`;

let synced: Promise<void> | null = null;

async function run() {
  if (!repoRealizacie.length) return;
  await prisma.$executeRawUnsafe(ENSURE_TABLE_SQL);

  const done = new Set(
    (await prisma.$queryRaw<{ key: string }[]>`SELECT "key" FROM "RepoContentImport"`).map((r) => r.key)
  );

  for (const item of repoRealizacie) {
    const key = `realizacia:${item.slug}`;
    if (done.has(key)) continue;

    const exists = await prisma.realizacia.findUnique({ where: { slug: item.slug }, select: { id: true } });
    if (!exists) {
      try {
        await prisma.realizacia.create({
          data: {
            slug: item.slug,
            title: item.title,
            subtitle: item.subtitle,
            description: item.description,
            image: item.image,
            images: item.images ?? [],
            category: item.category,
            year: item.year,
            material: item.material,
            size: item.size,
            leadTime: item.leadTime,
            featured: item.featured ?? false,
            seoKeywords: item.seoKeywords,
            content: item.content,
            published: true,
          },
        });
        console.log("Realizácia doplnená z repozitára:", item.slug);
      } catch (e) {
        // Súbežne ju mohla vložiť iná inštancia — to je v poriadku.
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
      }
    }
    await prisma.$executeRaw`INSERT INTO "RepoContentImport" ("key") VALUES (${key}) ON CONFLICT ("key") DO NOTHING`;
  }
}

/** Beží raz za život inštancie servera; chyba nikdy nezhodí stránku. */
export async function syncRepoRealizacie(): Promise<void> {
  if (!synced) {
    synced = run().catch((e) => {
      synced = null;
      console.error("Doplnenie realizácií z repozitára zlyhalo:", e);
    });
  }
  return synced;
}
