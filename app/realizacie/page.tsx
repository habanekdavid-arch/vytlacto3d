import Image from "next/image";
import Link from "next/link";
import { realizacie } from "@/lib/realizacie";

export const metadata = {
  title: "Realizácie 3D tlače | VytlačTo3D",
  description:
    "Ukážky realizácií 3D tlače, prototypov, technických dielov, náhradných dielov a zákazkovej výroby na mieru.",
};

export default function RealizaciePage() {
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

      <section className="grid auto-rows-[320px] gap-6 md:grid-cols-2 lg:grid-cols-4">
        {realizacie.map((project, index) => {
          const isLarge = index === 0 || index === 3;

          return (
            <Link
              key={project.slug}
              href={`/realizacie/${project.slug}`}
              className={[
                "group relative overflow-hidden rounded-[32px] border border-neutral-200 bg-white shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#FFAE00]/10",
                isLarge ? "md:col-span-2 md:row-span-2" : "",
              ].join(" ")}
            >
              <Image
                src={project.image}
                alt={project.title}
                fill
                sizes={
                  isLarge
                    ? "(max-width: 768px) 100vw, 50vw"
                    : "(max-width: 768px) 100vw, 25vw"
                }
                className="object-cover transition duration-700 ease-out group-hover:scale-110"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-80 transition duration-500 group-hover:opacity-95" />

              <div className="absolute left-5 top-5 rounded-full bg-white/15 px-4 py-2 text-xs font-bold text-white backdrop-blur-md ring-1 ring-white/20">
                {project.category}
              </div>

              <div className="absolute inset-x-0 bottom-0 p-6">
                <div className="translate-y-5 transition duration-500 ease-out group-hover:translate-y-0">
                  <h2
                    className={[
                      "font-extrabold tracking-tight text-white",
                      isLarge ? "text-3xl md:text-4xl" : "text-2xl",
                    ].join(" ")}
                  >
                    {project.title}
                  </h2>

                  <p className="mt-2 text-sm font-medium text-white/80">
                    {project.subtitle}
                  </p>

                  <p className="mt-4 max-h-0 overflow-hidden text-sm leading-7 text-white/85 opacity-0 transition-all duration-500 group-hover:max-h-40 group-hover:opacity-100">
                    {project.description}
                  </p>

                  <div className="mt-5 inline-flex translate-y-3 items-center rounded-full bg-[#FFAE00] px-4 py-2 text-xs font-bold text-black opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                    Otvoriť projekt
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}