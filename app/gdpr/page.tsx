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
          právnymi predpismi platnými na území SR. Zhotoviteľ ako prevádzkovateľ spracúva osobné
          údaje prostredníctvom svojich zamestnancov a spolupracovníkov, ktorí sú viazaní
          mlčanlivosťou, boli preškolení o právach a povinnostiach v oblasti bezpečnosti
          spracúvania osobných údajov a o zodpovednosti za ich porušenie. Pre zaistenie niektorých
          konkrétnych operácií sú využívané služby a aplikácie sprostredkovateľov, ktorí sú
          v súlade s platnou legislatívou.
        </p>

        <Section title="I. Identifikačné a kontaktné údaje prevádzkovateľa">
          4from media, s.r.o., Nezábudková 5, 821 01 Bratislava, zapísaná v obchodnom registri
          Mestského súdu Bratislava I, oddiel Sro, vložka č. 39182/B, IČO: 35 976 063,
          DIČ: 2022117966, IČ DPH: SK2022117966, tel. číslo:{" "}
          <a className="underline" href="tel:+421917244422">+421 917 244 422</a>, e-mail:{" "}
          <a className="underline" href="mailto:info@4frommedia.sk">info@4frommedia.sk</a>.
        </Section>

        <Section title="II. Kontaktné údaje zodpovednej osoby">
          V prípade otázok alebo akýchkoľvek pochybností sa môžete ohľadne spracovania osobných
          údajov informovať na tel. čísle:{" "}
          <a className="underline" href="tel:+421917244422">+421 917 244 422</a>, alebo e-mailovej
          adrese:{" "}
          <a className="underline" href="mailto:machalikova@4frommedia.sk">
            machalikova@4frommedia.sk
          </a>
          .
        </Section>

        <Section title="III. Identifikačné údaje sprostredkovateľov, príjemcov a spracovateľov osobných údajov kupujúcich">
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Spoločnosť Spot Transaction s.r.o., Komárňanská 69, 821 05 Bratislava,
              IČO: 36805092, spoločnosť zapísaná v OR Mestského súdu Bratislava I.,
              Oddiel Sro, vložka č. 46951/B
            </li>
            <li>
              Slovenská pošta, a. s., so sídlom: Partizánska cesta 9, 975 99 Banská Bystrica,
              IČO: 36631124, spoločnosť zapísaná v OR Okresného súdu Banská Bystrica,
              Oddiel Sa, vložka č. 803/S
            </li>
            <li>
              Slovak Parcel Service s.r.o., so sídlom: Senecká cesta 1, 900 28 Ivanka pri Dunaji,
              IČO: 31329217, spoločnosť zapísaná v OR Mestského súdu Bratislava I,
              Oddiel Sro, vložka č. 3215/B
            </li>
            <li>
              Direct Parcel Distribution SK s.r.o., so sídlom: Technická 7, 821 04 Bratislava,
              IČO: 35834498, spoločnosť zapísaná v OR Mestského súdu Bratislava I,
              Oddiel Sro, vložka č. 26367/B
            </li>
            <li>
              Packeta Slovakia s. r. o., Vajnorská 100/B, 831 04 Bratislava, IČO: 48136999,
              DIČ: 2120099014, IČ DPH: SK2120099014, spoločnosť zapísaná v Obchodnom registri
              Mestského súdu Bratislava III, oddiel: Sro, vložka číslo: 105158/B
            </li>
          </ul>
        </Section>

        <Section title="IV. Účel spracúvania osobných údajov">
          Účelom spracúvania osobných údajov je uzatvorenie a plnenie zmluvného vzťahu (kúpa
          a predaj tovaru) medzi Objednávateľom a zhotoviteľom (prevádzkovateľom).
          <br />
          Účelom môžu byť aj marketingové aktivity na ovplyvňovanie dopytu po produktoch
          predávaných prevádzkovateľom prostredníctvom aplikácií ako Facebook a Instagram,
          realizácie a vyhodnocovania spotrebiteľských a propagačných súťaží.
        </Section>

        <Section title="V. Zoznam získavaných a spracúvaných osobných údajov">
          Prevádzkovateľ získava a spracúva nasledovné osobné údaje:
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>meno</li>
            <li>priezvisko</li>
            <li>titul</li>
            <li>adresa trvalého bydliska</li>
            <li>adresa dodacia</li>
            <li>adresa fakturačná</li>
            <li>e-mail</li>
            <li>telefónne číslo</li>
          </ul>
        </Section>

        <Section title="VI. Dobrovoľnosť alebo povinnosť poskytnutia osobných údajov">
          Poskytnutie osobných údajov prostredníctvom objednávky v zmysle je dobrovoľné.
          <br />
          Za účelom uzatvorenia a plnenia zmluvného vzťahu sú však požadované osobné údaje
          povinné. Právnym základom spracúvania je zákon č. 40/1964 Zb. Občiansky zákonník,
          zákon č. 102/2014 Z. z. o ochrane spotrebiteľa pri predaji tovaru alebo poskytovaní
          služieb na základe zmluvy uzavretej na diaľku alebo zmluvy uzavretej mimo prevádzkových
          priestorov predávajúceho a o zmene a doplnení niektorých zákonov, zákona č. 18/2018 Z. z.
          o ochrane osobných údajov a o zmene a doplnení niektorých zákonov, zákon
          č. 108/2024 Z. z. o ochrane spotrebiteľa a o zmene a doplnení niektorých zákonov.
          Osobné údaje budú uchovávané v súlade s platnou legislatívou.
          <br />
          Odoslaním objednávky alebo odoslaním dopytu prostredníctvom stránky www.4from.media.sk
          udeľuje zákazník dobrovoľný súhlas so spracúvaním osobných údajov na marketingové účely
          aj v prípade, že nedôjde k uzatvoreniu a plneniu zmluvného vzťahu.
        </Section>

        <Section title="VII. Čas platnosti súhlasu, doba uchovávania osobných údajov">
          Osobné údaje získané za účelom uzatvorenia a plnenia zmluvného vzťahu medzi
          objednávateľom a zhotoviteľom (prevádzkovateľom) budú uchovávané v súlade s platnou
          legislatívou a následne budú bezpečne zlikvidované.
          <br />
          Osobné údaje na marketingové účely sa budú u prevádzkovateľa spracúvať po dobu 2 rokov.
          Po odvolaní súhlasu pred uplynutím 2 ročnej doby, alebo po uplynutí 2 ročnej doby
          a neobnovení súhlasu, budú osobné údaje uchovávané v súlade s platnou legislatívou
          a následne budú bezpečne zlikvidované.
        </Section>

        <Section title="VIII. Odvolanie súhlasu so spracovaním osobných údajov">
          Objednávateľ má právo svoj súhlas so spracovaním osobných údajov odvolať písomným
          „odvolaním súhlasu“ zaslaným doporučenou poštou na adresu sídla spoločnosti
          4from media, s.r.o., Nezábudková 5, 821 01 Bratislava alebo zaslaním e-mailu na adresu{" "}
          <a className="underline" href="mailto:info@4frommedia.sk">info@4frommedia.sk</a>.
        </Section>

        <Section title="IX. Kupujúci má v súvislosti so spracovaním osobných údajov právo">
          <p>
            Objednávateľ ako dotknutá osoba má podľa zák. č. 18/2018 Z. z. o ochrane osobných
            údajov a o zmene a doplnení niektorých zákonov v súvislosti so spracovaním osobných
            údajov najmä nasledujúce práva:
          </p>

          <p className="mt-3">
            Dotknutá osoba má právo získať od prevádzkovateľa potvrdenie o tom, či sa spracúvajú
            osobné údaje, ktoré sa jej týkajú. Ak prevádzkovateľ takéto osobné údaje spracúva,
            dotknutá osoba má právo získať prístup k týmto osobným údajom a informácie o
          </p>
          <ol className="list-[lower-alpha] pl-6 mt-2 space-y-1">
            <li>účele spracúvania osobných údajov,</li>
            <li>kategórii spracúvaných osobných údajov,</li>
            <li>
              identifikácii príjemcu alebo o kategórii príjemcu, ktorému boli alebo majú byť osobné
              údaje poskytnuté, najmä o príjemcovi v tretej krajine alebo o medzinárodnej
              organizácii, ak je to možné,
            </li>
            <li>
              dobe uchovávania osobných údajov; ak to nie je možné, informáciu o kritériách jej
              určenia,
            </li>
            <li>
              práve požadovať od prevádzkovateľa opravu osobných údajov týkajúcich sa dotknutej
              osoby, ich vymazanie alebo obmedzenie ich spracúvania, alebo o práve namietať
              spracúvanie osobných údajov,
            </li>
            <li>práve podať návrh na začatie konania podľa § 100,</li>
            <li>zdroji osobných údajov, ak sa osobné údaje nezískali od dotknutej osoby,</li>
            <li>
              existencii automatizovaného individuálneho rozhodovania vrátane profilovania podľa
              § 28 ods. 1 a 4; v týchto prípadoch poskytne prevádzkovateľ dotknutej osobe
              informácie najmä o použitom postupe, ako aj o význame a predpokladaných dôsledkoch
              takého spracúvania osobných údajov pre dotknutú osobu.
            </li>
          </ol>

          <p className="mt-3">
            Dotknutá osoba má právo byť informovaná o primeraných zárukách týkajúcich sa prenosu
            podľa § 48 ods. 2 až 4, ak sa osobné údaje prenášajú do tretej krajiny alebo
            medzinárodnej organizácii.
          </p>

          <p className="mt-3">
            Prevádzkovateľ je povinný poskytnúť dotknutej osobe jej osobné údaje, ktoré spracúva.
            Za opakované poskytnutie osobných údajov, o ktoré dotknutá osoba požiada, môže
            prevádzkovateľ účtovať primeraný poplatok zodpovedajúci administratívnym nákladom.
            Prevádzkovateľ je povinný poskytnúť osobné údaje dotknutej osobe spôsobom podľa jej
            požiadavky.
          </p>

          <p className="mt-3">
            Dotknutá osoba má právo kedykoľvek odvolať súhlas so spracovaním osobných údajov, ktoré
            sa jej týkajú. Odvolanie súhlasu nemá vplyv na zákonnosť spracúvania osobných údajov
            založeného na súhlase pred jeho odvolaním; pred poskytnutím súhlasu musí byť dotknutá
            osoba o tejto skutočnosti informovaná. Dotknutá osoba môže súhlas odvolať rovnakým
            spôsobom, akým súhlas udelila.
          </p>

          <p className="mt-3">
            Podľa Zákona č. 18/2018 Z. z. o ochrane osobných údajov má objednávateľ ako dotknutá
            osoba voči spoločnosti (prevádzkovateľovi) nasledovné práva:
          </p>
          <ol className="list-[lower-alpha] pl-6 mt-2 space-y-2">
            <li>
              <b>Právo na informácie a prístup k údajom:</b> Zistiť, či firma spracováva vaše
              údaje, za akým účelom, a požiadať o kópiu týchto údajov.
            </li>
            <li>
              <b>Právo na opravu:</b> Žiadať bezodkladnú opravu nesprávnych alebo doplnenie
              neúplných osobných údajov.
            </li>
            <li>
              <b>Právo na výmaz (právo na zabudnutie):</b> Žiadať vymazanie údajov, ak už nie sú
              potrebné na pôvodný účel, alebo ak odvoláte svoj súhlas.
            </li>
            <li>
              <b>Právo namietať:</b> Nesúhlasiť so spracúvaním, napríklad na účely priameho
              marketingu (zasielanie reklamných ponúk).
            </li>
            <li>
              <b>Právo na obmedzenie spracúvania:</b> Dočasne zablokovať spracúvanie svojich
              údajov, napr. kým sa overuje ich správnosť.
            </li>
            <li>
              <b>Právo na prenosnosť:</b> Získať svoje údaje v štruktúrovanom, strojovo čitateľnom
              formáte a preniesť ich k inému poskytovateľovi.
            </li>
            <li>
              <b>Právo podať sťažnosť:</b> Ak máte podozrenie, že sú vaše práva porušené, môžete
              podať návrh na začatie konania na Úrad na ochranu osobných údajov Slovenskej
              republiky.
            </li>
          </ol>
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
