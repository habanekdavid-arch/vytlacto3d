import Image from "next/image";
import Link from "next/link";

const articles = [
  {
    slug: "kolko-stoji-3d-tlac",
    title: "Koľko stojí 3D tlač?",
    subtitle: "Kompletný prehľad cien, faktorov a možností",
    excerpt:
      "Pozrite si, čo ovplyvňuje cenu 3D tlače, aké sú hlavné faktory pri nacenení a aké orientačné ceny môžete očakávať.",
    image: "/images/blog/3d-print-price.jpg",
    alt: "3D tlačené modely a cenový prehľad 3D tlače",
  },
];

export const metadata = {
  title: "Blog | Vytlač3D",
  description: "Články, návody a informácie zo sveta 3D tlače.",
};

export default function BlogPage() {
  return (
    <main className="bg-white px-4 py-14 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 md:text-5xl">
            Blog o 3D tlači
          </h1>
          <p className="mt-4 text-lg leading-8 text-zinc-600">
            Praktické články, návody a dôležité informácie o 3D tlači, materiáloch,
            cenách a možnostiach výroby na mieru.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden">
                <Image
                  src={article.image}
                  alt={article.alt}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              </div>

              <div className="p-6">
                <h2 className="text-xl font-bold leading-snug text-zinc-900 transition group-hover:text-zinc-700">
                  {article.title}
                </h2>

                <p className="mt-2 text-sm font-medium text-zinc-500">
                  {article.subtitle}
                </p>

                <p className="mt-4 text-sm leading-7 text-zinc-600">
                  {article.excerpt}
                </p>

                <span className="mt-5 inline-flex text-sm font-semibold text-zinc-900">
                  Čítať viac →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}