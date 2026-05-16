import Image from "next/image";

export const metadata = {
  title: "Realizácie 3D tlače | VytlačTo3D",
  description:
    "Ukážky realizácií 3D tlače, prototypov, technických dielov a zákazkovej výroby na mieru.",
};

const projects = [
  {
    title: "Technický prototyp",
    description:
      "Funkčný prototyp dielu na testovanie tvaru, rozmerov a použitia vo výrobe.",
    image: "/realizacie/technicky-prototyp.jpg",
  },
  {
    title: "Držiak na mieru",
    description:
      "Praktický 3D tlačený diel navrhnutý podľa konkrétneho použitia zákazníka.",
    image: "/realizacie/drziak-na-mieru.jpg",
  },
  {
    title: "Produktový model",
    description:
      "Vizuálny model produktu vhodný na prezentáciu, návrh alebo testovanie dizajnu.",
    image: "/realizacie/produktovy-model.jpg",
  },
  {
    title: "Náhradný diel",
    description:
      "Výroba plastového náhradného dielu tam, kde originál už nie je dostupný.",
    image: "/realizacie/nahradny-diel.jpg",
  },
  {
    title: "Firemná zákazka",
    description:
      "Malosériová výroba dielov pre firmu s dôrazom na presnosť a opakovateľnosť.",
    image: "/realizacie/firemna-zakazka.jpg",
  },
  {
    title: "Dizajnový objekt",
    description:
      "Estetický 3D výtlačok s dôrazom na povrch, detail a finálny vzhľad.",
    image: "/realizacie/dizajnovy-objekt.jpg",
  },
];

export default function RealizaciePage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <section className="mb-12 text-center">
        <div className="text-sm font-semibold text-[#FFAE00]">Realizácie</div>

        <h1 className="mx-auto mt-3 max-w-4xl text-4xl font-extrabold tracking-tight text-neutral-900 md:text-6xl">
          Ukážky 3D tlače a zákazkovej výroby
        </h1>

        <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-neutral-600">
          Pozrite si výber realizácií – od technických prototypov, cez náhradné
          diely až po dizajnové a firemné zákazky.
        </p>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <article
            key={project.title}
            className="group relative overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm"
          >
            <div className="relative h-[340px] w-full overflow-hidden">
              <Image
                src={project.image}
                alt={project.title}
                fill
                className="object-cover transition duration-700 ease-out group-hover:scale-110"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 transition duration-500 group-hover:opacity-90" />

              <div className="absolute inset-x-0 bottom-0 translate-y-8 p-6 transition duration-500 ease-out group-hover:translate-y-0">
                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-md ring-1 ring-white/20">
                  <h2 className="text-xl font-extrabold text-white">
                    {project.title}
                  </h2>

                  <p className="mt-3 max-h-0 overflow-hidden text-sm leading-relaxed text-white/85 opacity-0 transition-all duration-500 group-hover:max-h-40 group-hover:opacity-100">
                    {project.description}
                  </p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}