import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRealization, realizacie } from "@/lib/realizacie";

export async function generateStaticParams() {
  return realizacie.map((item) => ({
    slug: item.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getRealization(slug);

  if (!project) {
    return {
      title: "Realizácia nenájdená | VytlačTo3D",
    };
  }

  return {
  title: `${project.title} | Realizácie VytlačTo3D`,
  description: project.description,
  keywords: project.seoKeywords,
  openGraph: {
    title: project.title,
    description: project.description,
    images: [project.image],
  },
};
}

export default async function RealizationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getRealization(slug);

  if (!project) {
    notFound();
  }

  const otherProjects = realizacie
    .filter((item) => item.slug !== project.slug)
    .slice(0, 3);

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <Link
        href="/realizacie"
        className="mb-8 inline-flex rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50"
      >
        ← Späť na realizácie
      </Link>

      <article className="overflow-hidden rounded-[36px] border border-neutral-200 bg-white shadow-sm">
        <section className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative min-h-[420px] lg:min-h-[620px]">
            <Image
              src={project.image}
              alt={project.title}
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:hidden" />
          </div>

          <div className="flex flex-col justify-center p-8 md:p-12">
            <div className="w-fit rounded-full bg-[#FFAE00]/15 px-4 py-2 text-sm font-bold text-neutral-900">
              {project.category}
            </div>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-neutral-900 md:text-5xl">
              {project.title}
            </h1>

            <p className="mt-4 text-xl font-medium leading-relaxed text-neutral-700">
              {project.subtitle}
            </p>

            <p className="mt-5 text-base leading-8 text-neutral-600">
              {project.description}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <InfoCard label="Materiál" value={project.material} />
              <InfoCard label="Rozmer" value={project.size} />
              <InfoCard label="Realizácia" value={project.year} />
              <InfoCard label="Dodanie" value={project.leadTime} />
            </div>
          </div>
        </section>

        <section className="border-t border-neutral-200 px-6 py-12 md:px-12">
          <div className="mx-auto max-w-4xl space-y-12">
            {project.content.map((section) => (
              <section key={section.heading}>
                <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900">
                  {section.heading}
                </h2>

                <div className="mt-5 space-y-4">
                  {section.paragraphs.map((paragraph, index) => (
                    <p
                      key={index}
                      className="text-base leading-8 text-neutral-600"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      </article>

      <section className="mt-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[#FFAE00]">
              Ďalšie realizácie
            </div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
              Pozrite si aj ďalšie projekty
            </h2>
          </div>

          <Link
            href="/realizacie"
            className="hidden rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-bold text-neutral-900 shadow-sm transition hover:bg-neutral-50 md:inline-flex"
          >
            Všetky realizácie
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {otherProjects.map((item) => (
            <Link
              key={item.slug}
              href={`/realizacie/${item.slug}`}
              className="group overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition duration-500 hover:-translate-y-2 hover:shadow-xl"
            >
              <div className="relative h-64">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-110"
                />
              </div>

              <div className="p-5">
                <div className="text-xs font-bold text-[#FFAE00]">
                  {item.category}
                </div>
                <h3 className="mt-2 text-xl font-extrabold text-neutral-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  {item.subtitle}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-bold text-neutral-900">{value}</div>
    </div>
  );
}