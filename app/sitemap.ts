import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/content/produkty";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.vytlacto3d.sk";
  const now = new Date();

  const fixed: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/produkty`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/realizacie`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/komunita`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/kontakt`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${baseUrl}/gdpr`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${baseUrl}/podmienky`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    ...PRODUCTS.map((p) => ({
      url: `${baseUrl}/produkty/${p.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];

  // Články, realizácie a príspevky komunity z databázy. Výpadok databázy
  // nesmie zhodiť celú sitemapu — vtedy ostanú len pevné stránky.
  const [blog, realizacie, komunita] = await Promise.all([
    prisma.blogPost
      .findMany({ where: { published: true }, select: { slug: true, updatedAt: true } })
      .catch(() => []),
    prisma.realizacia
      .findMany({ where: { published: true, image: { not: "" } }, select: { slug: true, updatedAt: true } })
      .catch(() => []),
    prisma.communityPost
      .findMany({ where: { status: "PUBLISHED" }, select: { id: true, updatedAt: true }, take: 1000 })
      .catch(() => []),
  ]);

  return [
    ...fixed,
    ...blog.map((p) => ({ url: `${baseUrl}/blog/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...realizacie.map((r) => ({ url: `${baseUrl}/realizacie/${r.slug}`, lastModified: r.updatedAt, changeFrequency: "monthly" as const, priority: 0.5 })),
    ...komunita.map((c) => ({ url: `${baseUrl}/komunita/${c.id}`, lastModified: c.updatedAt, changeFrequency: "monthly" as const, priority: 0.4 })),
  ];
}
