import Image from "next/image";
import { notFound } from "next/navigation";
import { blogPosts, getBlogPost } from "@/lib/blog-posts";

export async function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return {
      title: "Článok nenájdený",
    };
  }

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
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

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
            {post.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
                  {section.heading}
                </h2>

                {section.paragraphs?.map((paragraph, index) => (
                  <p
                    key={index}
                    className="mt-4 text-base leading-8 text-neutral-700"
                  >
                    {paragraph}
                  </p>
                ))}

                {section.bullets && (
                  <ul className="mt-4 list-disc space-y-2 pl-6 text-base leading-8 text-neutral-700">
                    {section.bullets.map((bullet, index) => (
                      <li key={index}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {post.cta ? (
            <div className="mt-12 rounded-2xl border border-[#FFAE00]/30 bg-[#FFAE00]/10 p-6">
              <div className="text-lg font-bold text-neutral-900">
                {post.cta}
              </div>
            </div>
          ) : null}
        </div>
      </article>
    </main>
  );
}