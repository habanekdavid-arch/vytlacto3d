import Link from "next/link";
import Navbar from "@/components/Navbar";

const posts = [
  {
    slug: "ako-pripravit-stl-subor-na-3d-tlac",
    title: "Ako pripraviť STL súbor na 3D tlač",
    excerpt:
      "Základné odporúčania, ako pripraviť 3D model pred odoslaním do výroby, aby bola tlač rýchla, presná a bez zbytočných komplikácií.",
    category: "Príprava modelu",
  },
  {
    slug: "aky-material-zvolit-na-3d-tlac",
    title: "Aký materiál zvoliť na 3D tlač?",
    excerpt:
      "Porovnanie materiálov PLA, PETG, ABS a TPU. Kedy použiť pevnejší materiál, flexibilný materiál alebo materiál vhodný na prototypy.",
    category: "Materiály",
  },
  {
    slug: "ako-funguje-kalkulacia-ceny-3d-tlace",
    title: "Ako funguje kalkulácia ceny 3D tlače",
    excerpt:
      "Vysvetlenie, z čoho sa skladá cena 3D tlače a aké parametre ju najviac ovplyvňujú.",
    category: "Cenník",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <section className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-700 shadow-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-[#FFAE00]" />
            Blog o 3D tlači
          </div>

          <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-extrabold tracking-tight md:text-6xl">
            Novinky, návody a tipy zo sveta 3D tlače
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-neutral-600 md:text-lg">
            Praktické články o materiáloch, príprave STL súborov, cenotvorbe
            a celom procese výroby 3D modelov.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="inline-flex rounded-full bg-[#FFAE00]/15 px-3 py-1 text-xs font-semibold text-neutral-800">
                {post.category}
              </div>

              <h2 className="mt-4 text-xl font-extrabold tracking-tight text-neutral-900">
                {post.title}
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                {post.excerpt}
              </p>

              <div className="mt-5">
                <Link
                  href={`/blog/${post.slug}`}
                  className="text-sm font-semibold text-neutral-900 underline underline-offset-4"
                >
                  Čítať viac
                </Link>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}