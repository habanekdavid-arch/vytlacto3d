import Link from "next/link";

export const metadata = {
  title: "Blog o 3D tlači",
  description: "Tipy, ceny a možnosti 3D tlače",
};

export default function BlogPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      
      {/* HLAVNÝ ČLÁNOK */}
      <article className="prose prose-neutral max-w-none">
        <h1>Koľko stojí 3D tlač?</h1>
        <h2>Kompletný prehľad cien, faktorov a možností</h2>

        <p>
          3D tlač sa za posledné roky stala jednou z najdostupnejších technológií výroby.
          To, čo bolo kedysi možné len vo veľkých fabrikách, dnes zvládne moderná 3D tlačiareň rýchlo,
          presne a za rozumnú cenu.
        </p>

        <p><b>👉 Koľko stojí 3D tlač na mieru?</b></p>

        <p>
          Odpoveď nie je úplne jednoduchá – ale v tomto článku vám ju vysvetlíme tak,
          aby ste si vedeli spraviť reálnu predstavu.
        </p>

        <hr />

        <h3>💡 Prečo neexistuje jedna univerzálna cena</h3>
        <p>
          Na rozdiel od bežných produktov nemá 3D tlač fixnú cenu.
          Každý výrobok je unikát – a práve to je jej najväčšia výhoda.
        </p>

        <p><b>👉 Platíte len za to, čo si necháte vyrobiť.</b></p>

        <hr />

        <h3>🔍 5 hlavných faktorov</h3>

        <h4>1. Veľkosť a objem modelu</h4>
        <p>viac materiálu = vyššia cena</p>

        <h4>2. Typ materiálu</h4>
        <p>PLA, PETG, ABS – každý má inú cenu</p>

        <h4>3. Čas tlače</h4>
        <p>čím dlhšie, tým drahšie</p>

        <h4>4. Zložitosť modelu</h4>
        <p>detaily = viac práce</p>

        <h4>5. Post-processing</h4>
        <p>brúsenie, lakovanie = vyššia hodnota</p>

        <hr />

        <h3>💶 Reálne ceny</h3>

        <ul>
          <li>malý diel: 5 – 15 €</li>
          <li>technický diel: 20 – 60 €</li>
          <li>dekorácia: 15 – 50 €</li>
          <li>komplexný model: 50 – 150 €+</li>
        </ul>

        <hr />

        <h3>⚡ FAQ</h3>

        <p><b>Koľko stojí 3D tlač za gram?</b><br />
        0,05 € – 0,20 € / g</p>

        <p><b>Je 3D tlač drahá?</b><br />
        Nie, najmä pri malých sériách je lacná.</p>

        <hr />

        <h3>🚀 CTA</h3>

        <p>
          👉 Máte nápad, model alebo problém?
        </p>

        <Link
          href="/"
          className="inline-block rounded-xl bg-[#FFAE00] px-6 py-3 font-semibold text-black"
        >
          Vypočítať cenu
        </Link>
      </article>

      {/* PODČLÁNKY */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold mb-6">Ďalšie články</h2>

        <div className="grid gap-6 md:grid-cols-2">
          
          <BlogCard
            title="Ako funguje 3D tlač?"
            href="/blog/ako-funguje-3d-tlac"
          />

          <BlogCard
            title="Najlepšie materiály pre 3D tlač"
            href="/blog/materialy-3d-tlac"
          />

        </div>
      </section>

    </main>
  );
}

function BlogCard({ title, href }: { title: string; href: string }) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-neutral-200 p-6 hover:bg-neutral-50"
    >
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-neutral-600">
        Prečítať článok →
      </p>
    </Link>
  );
}