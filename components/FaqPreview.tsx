import Link from "next/link";

export default function FaqPreview() {
  const questions = [
    {
      q: "Aké súbory podporujete?",
      a: "Momentálne podporujeme STL (.stl), ktorý je najbežnejší formát pre 3D tlač.",
    },
    {
      q: "Ako sa počíta cena tlače?",
      a: "Cena sa počíta podľa objemu modelu, materiálu, kvality tlače, pevnosti výplne a počtu kusov.",
    },
    {
      q: "Ako dlho trvá výroba?",
      a: "Čas výroby závisí od veľkosti modelu a zvolených parametrov. Väčšina objednávok sa spracuje v priebehu niekoľkých dní.",
    },
  ];

  return (
    <section id="faq" className="bg-neutral-50 px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-700 shadow-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-[#FFAE00]" />
            FAQ a užitočné informácie
          </div>

          <h2 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Často kladené otázky
          </h2>

          <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-neutral-600 sm:text-base">
            Odpovede na najčastejšie otázky o 3D tlači, cenách, priebehu objednávky
            a základných technických požiadavkách na model.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {questions.map((item, index) => (
            <article
              key={index}
              className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <h3 className="text-lg font-bold text-neutral-900">{item.q}</h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                {item.a}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/blog"
            className="rounded-2xl bg-[#FFAE00] px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
          >
            Prejsť na blog
          </Link>

          <Link
            href="/#kalkulator"
            className="rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
          >
            Prejsť na kalkulátor
          </Link>
        </div>
      </div>
    </section>
  );
}