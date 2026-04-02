import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

type BlogArticleLayoutProps = {
  title: string;
  subtitle: string;
  intro: string[];
  image: {
    src: string;
    alt: string;
  };
  children: ReactNode;
};

export default function BlogArticleLayout({
  title,
  subtitle,
  intro,
  image,
  children,
}: BlogArticleLayoutProps) {
  return (
    <article className="bg-white text-zinc-900">
      <section className="px-4 pt-14 pb-10 md:pt-20 md:pb-14">
        <div className="mx-auto max-w-4xl text-center">
          <Link
            href="/blog"
            className="mb-6 inline-flex text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
          >
            ← Späť na blog
          </Link>

          {/* Hlavný názov */}
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            {title}
          </h1>

          {/* Vedľajší názov */}
          <p className="mt-4 text-lg font-medium text-zinc-500 md:text-2xl">
            {subtitle}
          </p>

          <div className="mx-auto mt-8 h-1 w-16 rounded-full bg-zinc-900" />

          {/* Intro */}
          <div className="mx-auto mt-8 max-w-2xl space-y-4 text-base leading-8 text-zinc-700 md:text-lg">
            {intro.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Iba jeden obrázok */}
      <section className="px-4 pb-12">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-zinc-200 shadow-sm">
          <div className="relative aspect-[16/8] w-full">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Obsah článku */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-3xl space-y-8 text-zinc-700">
          {children}
        </div>
      </section>
    </article>
  );
}