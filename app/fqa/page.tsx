export default function FaqPage() {
  const items = [
    {
      q: "Čo je VytlačTo3D?",
      a: "VytlačTo3D je online konfigurátor 3D tlače, kde si zákazník nahrá STL model, nastaví materiál, kvalitu tlače, pevnosť, farbu a počet kusov. Systém následne automaticky vypočíta cenu objednávky.",
    },
    {
      q: "Aké súbory podporujete?",
      a: "Momentálne podporujeme STL (.stl). Tento formát je najbežnejší pre 3D tlač a je vhodný pre väčšinu modelov určených na výrobu.",
    },
    {
      q: "Ako sa počíta cena?",
      a: "Cena sa počíta podľa objemu modelu, typu materiálu, nastavenej kvality tlače, pevnosti výplne (infill), počtu kusov a odhadovaného času tlače. Výpočet prebieha automaticky priamo v konfigurátore.",
    },
    {
      q: "Kedy zadávam adresu a dopravu?",
      a: "Adresu doručenia a spôsob dopravy zákazník zadáva v Stripe checkoute pri platbe. Nemusí ich teda vypĺňať priamo v konfigurátore.",
    },
    {
      q: "Môžem si pozrieť model pred objednávkou?",
      a: "Áno. Po nahratí STL modelu sa zobrazí 3D náhľad, v ktorom si vie zákazník model otáčať, približovať a skontrolovať aj vizuálnu farbu podľa nastavenia v konfigurátore.",
    },
    {
      q: "Je farba modelu vo vieweri záväzná?",
      a: "Farba vo vieweri je vizuálna ukážka. Reálna dostupnosť farieb závisí od materiálu a skladu. Výber farby však slúži ako dôležitá informácia pre objednávku.",
    },
    {
      q: "Ako prebieha stav objednávky po zaplatení?",
      a: "Objednávka prechádza internými stavmi PENDING, PAID, PRINTING a DONE. Po úspešnej platbe Stripe webhook automaticky nastaví objednávku na PAID.",
    },
    {
      q: "Je možné objednávku upraviť po zaplatení?",
      a: "Ak sa tlač ešte nezačala, objednávku vieme individuálne upraviť po dohode. Po spustení výroby už zvyčajne nie je možné parametre meniť.",
    },
    {
      q: "Dostanem potvrdenie o zaplatení?",
      a: "Áno. Po úspešnej platbe je možné zákazníkovi automaticky odoslať emailové potvrdenie s detailom objednávky.",
    },
    {
      q: "Ako dlho trvá výroba?",
      a: "Dĺžka výroby závisí od veľkosti modelu, materiálu, kvality a počtu kusov. Presný čas tlače sa premieta aj do výslednej ceny.",
    },
  ];

  return (
    <main className="min-h-screen bg-white px-6 py-16 text-neutral-900">
      <div className="mx-auto max-w-5xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-600 shadow-sm">
          <span className="inline-block h-2 w-2 rounded-full bg-[#FFAE00]" />
          FAQ
        </div>

        <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Často kladené otázky
        </h1>

        <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-600">
          Tu nájdeš odpovede na najčastejšie otázky o konfigurátore, objednávke,
          platbe, doprave a procese 3D tlače.
        </p>

        <section className="mt-10 space-y-4">
          {items.map((item, index) => (
            <article
              key={index}
              className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFAE00] text-sm font-bold text-black">
                  {index + 1}
                </div>

                <div>
                  <h2 className="text-lg font-bold text-neutral-900">
                    {item.q}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                    {item.a}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}