export const runtime = "nodejs";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
      <div className="mt-3 space-y-3 text-sm font-normal leading-relaxed text-neutral-700">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  const updated = "01.03.2026";

  return (
    <main className="bg-white px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="text-sm font-semibold text-brand">Dokument</div>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-neutral-900">
          Obchodné podmienky
        </h1>
        <p className="mt-4 text-sm font-normal text-neutral-600">
          Posledná aktualizácia: {updated}
        </p>

        <Section title="1. Predávajúci / Prevádzkovateľ">
          <p>
            Predávajúcim je spoločnosť <b>4from media, s.r.o.</b>, Nezábudková 5, 821 01 Bratislava,
            IČO: 35976063, DIČ: 2022117966, IČ DPH: SK2022117966.
          </p>
          <p>
            Značka/web: <b>VytlačTo3D</b> (projekt spoločnosti 4from media, s.r.o.).
          </p>
          <p>
            Kontakt:{" "}
            <a className="underline" href="mailto:info@4frommedia.sk">
              info@4frommedia.sk
            </a>{" "}
            •{" "}
            <a className="underline" href="tel:+421907907097">
              +421 907 907 097
            </a>
          </p>
        </Section>

        <Section title="2. Predmet služby">
          <p>
            VytlačTo3D poskytuje službu 3D tlače na mieru. Zákazník nahrá vlastný STL súbor a zvolí parametre tlače
            (materiál, kvalita, pevnosť, farba, množstvo). Cena sa vypočíta automaticky a zákazník uhradí objednávku
            platbou kartou.
          </p>
        </Section>

        <Section title="3. Objednávka a uzatvorenie zmluvy">
          <ul className="list-disc pl-5">
            <li>Zákazník vytvorí objednávku cez web a uhradí ju cez Stripe.</li>
            <li>Po úspešnej úhrade je objednávka považovaná za záväznú.</li>
            <li>Prevádzkovateľ môže zákazníka kontaktovať v prípade nejasností (napr. nevhodný súbor, technické limity).</li>
          </ul>
        </Section>

        <Section title="4. Cena a platba">
          <ul className="list-disc pl-5">
            <li>Cena sa vypočíta podľa objemu modelu, zvolených parametrov a odhadovaného času tlače.</li>
            <li>Platba prebieha kartou cez poskytovateľa Stripe.</li>
            <li>Doprava (poštovné) sa vyberá počas checkoutu a je pripočítaná k cene.</li>
          </ul>
        </Section>

        <Section title="5. Dodanie a doprava">
          <ul className="list-disc pl-5">
            <li>Spôsob dopravy a cenu dopravy si zákazník vyberá v checkout kroku.</li>
            <li>Dodacie lehoty sú orientačné a môžu sa líšiť podľa vyťaženosti výroby a náročnosti modelu.</li>
          </ul>
        </Section>

        <Section title="6. Špecifiká produktu na mieru (3D tlač)">
          <p>
            3D tlač je služba vytvorená <b>na mieru</b> podľa dodaného digitálneho súboru. Výsledný produkt môže mať
            drobné vizuálne odchýlky typické pre 3D tlač (vrstvy, tolerancie, drobné nerovnosti).
          </p>
        </Section>

        <Section title="7. Reklamácie">
          <ul className="list-disc pl-5">
            <li>Ak je produkt poškodený alebo nevyhovuje objednaným parametrom, zákazník nás kontaktuje emailom.</li>
            <li>V reklamácii uveďte číslo objednávky, popis problému a ideálne fotodokumentáciu.</li>
            <li>Reklamáciu vybavíme v primeranej lehote.</li>
          </ul>
        </Section>

        <Section title="8. Odstúpenie od zmluvy">
          <p>
            Keďže ide o produkt vyrobený na mieru podľa dodaného STL súboru, právo na odstúpenie od zmluvy bez uvedenia
            dôvodu môže byť obmedzené v zmysle platných právnych predpisov (tovar vyrobený podľa špecifikácií spotrebiteľa).
          </p>
        </Section>

        <Section title="9. Ochrana osobných údajov">
          <p>
            Informácie o spracúvaní osobných údajov sú uvedené na stránke{" "}
            <a className="underline" href="/gdpr">
              GDPR
            </a>
            .
          </p>
        </Section>

        <Section title="10. Záverečné ustanovenia">
          <p>
            Tieto obchodné podmienky sú platné od dátumu uvedeného vyššie. Prevádzkovateľ si vyhradzuje právo podmienky
            aktualizovať.
          </p>
        </Section>
      </div>
    </main>
  );
}