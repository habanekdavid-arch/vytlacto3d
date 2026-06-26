import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type BlogSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });

  if (!post) return { title: "Článok nenájdený" };

  return {
    title: `${post.title} | VytlačTo3D`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      images: [post.image],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug, published: true } });

  if (!post) notFound();

  const sections = post.sections as BlogSection[];

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <article className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="relative h-[320px] w-full md:h-[420px]">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover"
            priority
          />
        </div>

        <div className="p-6 md:p-10">
          <div className="text-sm font-semibold text-[#FFAE00]">Blog</div>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-neutral-900 md:text-5xl">
            {post.title}
          </h1>

          <p className="mt-4 text-lg font-medium text-neutral-700">
            {post.subtitle}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
            <span>{post.publishedAt}</span>
            <span>•</span>
            <span>{post.readingTime}</span>
          </div>

          <div className="mt-10 space-y-10">
            {sections.map((section, idx) => (
              <section key={idx}>
                <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
                  {section.heading}
                </h2>

                {section.paragraphs?.map((paragraph, i) => (
                  <p key={i} className="mt-4 text-base leading-8 text-neutral-700">
                    {paragraph}
                  </p>
                ))}

                {section.bullets && section.bullets.length > 0 && (
                  <ul className="mt-4 list-disc space-y-2 pl-6 text-base leading-8 text-neutral-700">
                    {section.bullets.map((bullet, i) => (
                      <li key={i}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {post.cta ? (
            <div className="mt-12 rounded-2xl border border-[#FFAE00]/30 bg-[#FFAE00]/10 p-6">
              <div className="text-lg font-bold text-neutral-900">{post.cta}</div>
            </div>
          ) : null}
        </div>
      </article>
    </main>
  );
}
