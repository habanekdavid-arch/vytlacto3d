import { prisma } from "@/lib/prisma";
import { repoBlogPosts } from "@/content/blog";
import { importOnce, oncePerInstance } from "@/lib/repo-content";

/** Vloží do databázy články z content/blog.ts, ktoré tam ešte neboli. */
export const syncRepoBlog = oncePerInstance("Doplnenie článkov z repozitára", () =>
  importOnce(
    repoBlogPosts,
    (post) => `blog:${post.slug}`,
    async (post) =>
      !!(await prisma.blogPost.findFirst({
        where: { OR: [{ slug: post.slug }, { id: post.id }] },
        select: { id: true },
      })),
    async (post) => {
      await prisma.blogPost.create({
        data: {
          id: post.id,
          slug: post.slug,
          title: post.title,
          subtitle: post.subtitle,
          description: post.description,
          image: post.image,
          publishedAt: post.publishedAt,
          readingTime: post.readingTime,
          featured: post.featured ?? false,
          sections: post.sections,
          cta: post.cta ?? null,
          published: true,
        },
      });
    }
  )
);
