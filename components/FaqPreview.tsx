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
        <h2 className="text-center text-4xl font-extrabold tracking-tight sm:text-5xl">
          Často kladené otázky
        </h2>

        <p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-relaxed text-neutral-600">
          Odpovede na najčastejšie otázky o 3D tlači, cenách a priebehu objednávky.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {questions.map((item, index) => (
            <article
              key={index}
              className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-bold text-neutral-900">{item.q}</h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                {item.a}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}