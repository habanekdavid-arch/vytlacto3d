import { prisma } from "@/lib/prisma";
import { syncRepoRealizacie } from "@/lib/realizacie-sync";
import RealizacieGrid from "@/components/RealizacieGrid";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Realizácie 3D tlače | VytlačTo3D",
  description:
    "Ukážky realizácií 3D tlače, prototypov, technických dielov, náhradných dielov a zákazkovej výroby na mieru.",
};

export default async function RealizaciePage() {
  await syncRepoRealizacie();
  const realizacie = await prisma.realizacia.findMany({
    where: { published: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <section className="mb-14 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-600 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-[#FFAE00]" />
          Realizácie
        </div>

        <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-extrabold tracking-tight text-neutral-900 md:text-6xl">
          Ukážky 3D tlače a zákazkovej výroby
        </h1>

        <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-neutral-600">
          Vybrané projekty, ktoré ukazujú možnosti 3D tlače v praxi — od
          prototypov, cez náhradné diely až po firemné zákazky a dizajnové
          objekty.
        </p>
      </section>

      {realizacie.length ? (
        <RealizacieGrid
          projects={realizacie.map((p) => ({
            slug: p.slug,
            title: p.title,
            subtitle: p.subtitle,
            description: p.description,
            image: p.image,
            category: p.category,
            material: p.material,
            leadTime: p.leadTime,
            featured: p.featured,
          }))}
        />
      ) : (
        <p className="text-center text-neutral-500">Realizácie pripravujeme.</p>
      )}
    </main>
  );
}
