import { prisma } from "@/lib/prisma";
import { repoRealizacie } from "@/content/realizacie";
import { importOnce, oncePerInstance } from "@/lib/repo-content";

/** Vloží do databázy realizácie z content/realizacie.ts, ktoré tam ešte neboli. */
export const syncRepoRealizacie = oncePerInstance("Doplnenie realizácií z repozitára", () =>
  importOnce(
    repoRealizacie,
    (item) => `realizacia:${item.slug}`,
    async (item) =>
      !!(await prisma.realizacia.findFirst({
        where: { OR: [{ slug: item.slug }, ...(item.id ? [{ id: item.id }] : [])] },
        select: { id: true },
      })),
    async (item) => {
      await prisma.realizacia.create({
        data: {
          ...(item.id ? { id: item.id } : {}),
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
          published: item.published ?? true,
        },
      });
    }
  )
);
