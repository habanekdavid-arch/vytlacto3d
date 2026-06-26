import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Blog o 3D tlači",
  description:
    "Články o 3D tlači, cenách 3D tlače, materiáloch, STL súboroch a možnostiach výroby na mieru.",
};

export default async function BlogPage() {
  const allPosts = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
  });

  const featuredPost = allPosts.find((p) => p.featured) ?? allPosts[0];
  const otherPosts = allPosts.filter((p) => p.id !== featuredPost?.id);

  if (!featuredPost) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-neutral-500">Žiadne články.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <section className="mb-14 animate-fade-up">
        <div className="mb-3 text-sm font-semibold text-neutral-500">Blog</div>
        <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 md:text-5xl">
          Blog o 3D tlači
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-600">
          Praktické články o 3D tlači, cenách, materiáloch, STL modeloch,
          prototypovaní a výrobe na mieru.
        </p>
      </section>

      <section className="mb-16">
        <Link
          href={`/blog/${featuredPost.slug}`}
          className="group grid overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-xl md:grid-cols-2 animate-fade-up"
          style={{ animationDelay: "80ms" }}
        >
          <div className="relative min-h-[280px] overflow-hidden">
            <Image
              src={featuredPost.image}
              alt={featuredPost.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              priority
            />
          </div>

          <div className="flex flex-col justify-center p-8">
            <div className="text-sm font-semibold text-[#FFAE00]">
              Hlavný článok
            </div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-neutral-900 transition-colors duration-200 group-hover:text-neutral-700">
              {featuredPost.title}
            </h2>
            <p className="mt-2 text-lg font-medium text-neutral-700">
              {featuredPost.subtitle}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-neutral-600">
              {featuredPost.description}
            </p>

            <div className="mt-6 flex items-center gap-4 text-sm text-neutral-500">
              <span>{featuredPost.readingTime}</span>
              <span>•</span>
              <span>{featuredPost.publishedAt}</span>
            </div>

            <div className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl bg-[#FFAE00] px-5 py-3 text-sm font-semibold text-black transition-all duration-200 group-hover:gap-3">
              Prečítať článok
              <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
            </div>
          </div>
        </Link>
      </section>

      {otherPosts.length > 0 && (
        <section>
          <h2 className="mb-6 text-2xl font-bold text-neutral-900 animate-fade-up" style={{ animationDelay: "160ms" }}>
            Ďalšie články
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            {otherPosts.map((post, index) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-xl animate-fade-up"
                style={{ animationDelay: `${220 + index * 80}ms` }}
              >
                <div className="relative h-56 overflow-hidden">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold text-neutral-900 transition-colors duration-200 group-hover:text-[#FFAE00]">
                    {post.title}
                  </h3>
                  <p className="mt-2 text-sm font-medium text-neutral-700">
                    {post.subtitle}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                    {post.description}
                  </p>

                  <div className="mt-5 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                      <span>{post.readingTime}</span>
                      <span>•</span>
                      <span>{post.publishedAt}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-400 transition-all duration-200 group-hover:gap-2 group-hover:text-neutral-700">
                      Čítať <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
