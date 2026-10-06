import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Spoločný základ pre obsah z repozitára (content/*.ts), ktorý si web sám
 * vloží do databázy. Každá položka sa vloží len raz — záznam v
 * RepoContentImport zaručí, že úpravy aj zmazanie v CMS ostanú tak, ako ich
 * admin nechal.
 */

const ENSURE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS "RepoContentImport" (
    "key" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepoContentImport_pkey" PRIMARY KEY ("key")
)`;

/**
 * Pre každú ešte nevloženú položku zavolá `insert` a zapíše jej kľúč.
 * `insert` sa volá len keď záznam v DB chýba (`exists` vráti false).
 */
export async function importOnce<T>(
  items: T[],
  keyOf: (item: T) => string,
  exists: (item: T) => Promise<boolean>,
  insert: (item: T) => Promise<void>
): Promise<void> {
  if (!items.length) return;
  await prisma.$executeRawUnsafe(ENSURE_TABLE_SQL);

  const done = new Set(
    (await prisma.$queryRaw<{ key: string }[]>`SELECT "key" FROM "RepoContentImport"`).map((r) => r.key)
  );

  for (const item of items) {
    const key = keyOf(item);
    if (done.has(key)) continue;

    if (!(await exists(item))) {
      try {
        await insert(item);
        console.log("Doplnené z repozitára:", key);
      } catch (e) {
        // Súbežne ju mohla vložiť iná inštancia — to je v poriadku.
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
      }
    }
    await prisma.$executeRaw`INSERT INTO "RepoContentImport" ("key") VALUES (${key}) ON CONFLICT ("key") DO NOTHING`;
  }
}

/** Spustí `run` raz za život inštancie servera; chyba nikdy nezhodí stránku. */
export function oncePerInstance(label: string, run: () => Promise<void>): () => Promise<void> {
  let synced: Promise<void> | null = null;
  return () => {
    if (!synced) {
      synced = run().catch((e) => {
        synced = null;
        console.error(`${label} zlyhalo:`, e);
      });
    }
    return synced;
  };
}
