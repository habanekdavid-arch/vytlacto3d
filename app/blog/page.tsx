import Link from "next/link";
import Image from "next/image";
import { blogPosts } from "@/lib/blog-posts";

export const metadata = {
  title: "Blog o 3D tlači",
  description:
    "Články o 3D tlači, cenách 3D tlače, materiáloch, STL súboroch a možnostiach výroby na mieru.",
};

export default function BlogPage() {
  const featuredPost = blogPosts.find((post) => post.featured) ?? blogPosts[0];
  const otherPosts = blogPosts.filter((post) => post.slug !== featuredPost.slug);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <section className="mb-14">
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
          className="grid overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-md md:grid-cols-2"
        >
          <div className="relative min-h-[280px]">
            <Image
              src={featuredPost.image}
              alt={featuredPost.title}
              fill
              className="object-cover"
              priority
            />
          </div>

          <div className="flex flex-col justify-center p-8">
            <div className="text-sm font-semibold text-[#FFAE00]">
              Hlavný článok
            </div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-neutral-900">
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

            <div className="mt-6 inline-flex w-fit rounded-xl bg-[#FFAE00] px-5 py-3 text-sm font-semibold text-black">
              Prečítať článok
            </div>
          </div>
        </Link>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-bold text-neutral-900">
          Ďalšie články
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          {otherPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="relative h-56">
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold text-neutral-900">
                  {post.title}
                </h3>
                <p className="mt-2 text-sm font-medium text-neutral-700">
                  {post.subtitle}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                  {post.description}
                </p>

                <div className="mt-5 flex items-center gap-4 text-xs text-neutral-500">
                  <span>{post.readingTime}</span>
                  <span>•</span>
                  <span>{post.publishedAt}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}