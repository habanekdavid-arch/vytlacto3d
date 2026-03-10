export default function GDPRPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-4xl px-6 py-16">

        <h1 className="text-4xl font-extrabold tracking-tight">
          GDPR – Ochrana osobných údajov
        </h1>

        <p className="mt-6 text-neutral-700 leading-relaxed">
          ZÁSADY SPRACOVANIA A OCHRANY OSOBNÝCH ÚDAJOV
        </p>

        <p className="mt-4 text-neutral-700 leading-relaxed">
          Spoločnosť 4from media, s.r.o. spracúva osobné údaje v súlade s príslušnými právnymi
          predpismi, podľa zákona č. 18/2018 Z. z. o ochrane osobných údajov a o zmene a doplnení
          niektorých zákonov.
        </p>

        <p className="mt-4 text-neutral-700 leading-relaxed">
          Zaobchádzanie s osobnými údajmi sa riadi Zákonom o ochrane osobných údajov a ostatnými
          právnymi predpismi platnými na území SR. Predávajúci ako prevádzkovateľ spracúva osobné
          údaje prostredníctvom svojich zamestnancov a spolupracovníkov, ktorí sú viazaní
          mlčanlivosťou, boli preškolení o právach a povinnostiach v oblasti bezpečnosti
          spracúvania osobných údajov a o zodpovednosti za ich porušenie.
        </p>

        <p className="mt-4 text-neutral-700 leading-relaxed">
          Pre zaistenie niektorých konkrétnych operácií sú využívané služby a aplikácie
          sprostredkovateľov, ktorí sú v súlade s platnou legislatívou.
        </p>

        <Section title="I. Identifikačné a kontaktné údaje prevádzkovateľa">
          4from media, s.r.o., Nezábudková 5, 821 01 Bratislava, zapísaná v obchodnom registri
          Okresného súdu Bratislava I, oddiel Sro, vložka č. 39182/B, IČO: 35 976 063,
          DIČ: 2022117966, IČ DPH: SK2022117966, tel. číslo: +421 917 244 422,
          e-mail: info@4frommedia.sk.
        </Section>

        <Section title="II. Kontaktné údaje zodpovednej osoby">
          V prípade otázok alebo akýchkoľvek pochybností sa môžete ohľadne spracovania osobných
          údajov informovať na tel. čísle: +421 917 244 422 alebo e-mailovej adrese:
          machalikova@4frommedia.sk.
        </Section>

        <Section title="III. Sprostredkovatelia spracovania osobných údajov">
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Spot Transaction s.r.o., Komárňanská 69, 821 05 Bratislava,
              IČO: 36805092.
            </li>
            <li>
              Slovenská pošta, a. s., Partizánska cesta 9,
              975 99 Banská Bystrica, IČO: 36631124.
            </li>
            <li>
              Slovak Parcel Service s.r.o., Senecká cesta 1,
              900 28 Ivanka pri Dunaji, IČO: 31329217.
            </li>
            <li>
              Direct Parcel Distribution SK s.r.o., Technická 7,
              821 04 Bratislava, IČO: 35834498.
            </li>
          </ul>
        </Section>

        <Section title="IV. Účel spracúvania osobných údajov">
          Účelom spracúvania osobných údajov je uzatvorenie a plnenie zmluvného vzťahu medzi
          kupujúcim a predávajúcim (kúpa a predaj tovaru).
          <br />
          Účelom môžu byť aj marketingové aktivity na ovplyvňovanie dopytu po produktoch
          prostredníctvom aplikácií ako Facebook a Instagram.
        </Section>

        <Section title="V. Zoznam spracúvaných osobných údajov">
          Prevádzkovateľ spracúva nasledovné osobné údaje:
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>meno a priezvisko</li>
            <li>titul</li>
            <li>adresa trvalého bydliska</li>
            <li>dodacia a fakturačná adresa</li>
            <li>e-mail</li>
            <li>telefónne číslo</li>
          </ul>
        </Section>

        <Section title="VI. Dobrovoľnosť poskytnutia osobných údajov">
          Poskytnutie osobných údajov prostredníctvom objednávky je dobrovoľné.
          Na uzatvorenie zmluvného vzťahu sú však niektoré osobné údaje potrebné.
        </Section>

        <Section title="VII. Doba uchovávania údajov">
          Osobné údaje získané za účelom plnenia zmluvy budú uchovávané v súlade
          s platnou legislatívou.
          <br />
          Údaje spracúvané na marketingové účely budú uchovávané maximálne
          po dobu 2 rokov.
        </Section>

        <Section title="VIII. Odvolanie súhlasu">
          Súhlas so spracovaním osobných údajov je možné kedykoľvek odvolať
          zaslaním písomného odvolania na adresu spoločnosti alebo
          e-mailom na info@4frommedia.sk.
        </Section>

        <Section title="IX. Práva dotknutej osoby">
          <ul className="list-disc pl-6 space-y-2">
            <li>právo odvolať súhlas</li>
            <li>právo na prístup k osobným údajom</li>
            <li>právo na opravu údajov</li>
            <li>právo na vymazanie údajov</li>
            <li>právo na obmedzenie spracovania</li>
            <li>právo na prenosnosť údajov</li>
            <li>právo podať sťažnosť na Úrad na ochranu osobných údajov</li>
            <li>právo namietať spracovanie údajov na marketingové účely</li>
          </ul>
        </Section>

      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-neutral-900">{title}</h2>
      <div className="mt-3 text-neutral-700 leading-relaxed">{children}</div>
    </section>
  );
}