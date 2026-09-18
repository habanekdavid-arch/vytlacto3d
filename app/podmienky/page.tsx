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

function Points({ children }: { children: React.ReactNode }) {
  return <ol className="list-decimal space-y-3 pl-5">{children}</ol>;
}

export default function TermsPage() {
  const updated = "10.09.2026";

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

        <Section title="1. Všeobecné ustanovenia">
          <Points>
            <li>
              Prevádzkovateľom tohto obchodu ako aj zhotoviteľom je obchodná spoločnosť{" "}
              <b>4from media, s.r.o.</b>, so sídlom Nezábudková 5, 821 01 Bratislava, zapísaná
              v Obchodnom registri Mestského súdu Bratislava III, vložka číslo: 39182/B,
              oddiel: Sro, IČO: 35 976 063, IČ DPH: SK2022117966, DIČ: 2022117966.
              <br />
              Značka/web: <b>VytlačTo3D</b> (projekt spoločnosti 4from media, s.r.o.).
              <br />
              Kontakt:{" "}
              <a className="underline" href="mailto:info@4frommedia.sk">
                info@4frommedia.sk
              </a>{" "}
              •{" "}
              <a className="underline" href="tel:+421907907097">
                +421 907 907 097
              </a>
            </li>
            <li>
              Používaním tejto webstránky a potvrdením objednávky dáva objednávateľ súhlas
              s týmito Obchodnými podmienkami. Tieto Obchodné podmienky sú platné až do vydania
              nových Obchodných podmienok.
            </li>
            <li>
              Právne vzťahy medzi zhotoviteľom a objednávateľom sa radia Všeobecnými obchodnými
              podmienkami a ustanoveniami príslušných právnych predpisov najmä Občianskeho
              zákonníka, Obchodného zákonníka, Zákona č. 108/2024 Z. z. o ochrane spotrebiteľa
              pri predaji tovaru alebo poskytovaní služieb na základe zmluvy uzavretej na diaľku
              alebo zmluvy uzavretej mimo prevádzkových priestorov predávajúceho a Zákona
              č. 22/2004 Z. z. o elektronickom obchode.
            </li>
            <li>
              Orgánom dozoru je Slovenská obchodná inšpekcia (SOI), ktorá je orgánom štátnej
              kontroly vnútorného trhu vo veciach ochrany spotrebiteľa s celoslovenskou
              pôsobnosťou. Pri plnení tejto úlohy SOI vykonáva kontrolu predaja produktov
              spotrebiteľom na vnútornom trhu a dohľad nad trhom podľa osobitného predpisu.
              <br />
              Ústredný inšpektorát SOI, Bajkalská 21/A, P. O. BOX 29, 827 99 Bratislava
              <br />
              Inšpektorát SOI pre Bratislavský kraj, Bajkalská 21/A, P. O. BOX č. 5,
              820 07 Bratislava, Odbor výkonu dohľadu
            </li>
          </Points>
        </Section>

        <Section title="2. Predmet zmluvy o dielo">
          <Points>
            <li>
              Zhotoviteľ sa zaväzuje pre objednávateľa (zákazníka) zhotoviť vec na zákazku –
              3D výtlačok na mieru (dielo) podľa špecifikácií zadaných objednávateľom.
              Objednávateľ sa zaväzuje zhotovené dielo prevziať a zaplatiť zaň dohodnutú cenu.
            </li>
            <li>
              Objednávateľ na účel zhotovenia diela nahrá vlastný digitálny model vo formáte
              STL, OBJ, SVG a zvolí požadované parametre (materiál, kvalita, pevnosť/výplň,
              farba, množstvo).
            </li>
            <li>
              Materiál na zhotovenie diela obstaráva a dodáva zhotoviteľ a jeho cena je už
              zahrnutá v celkovej cene diela.
            </li>
          </Points>
        </Section>

        <Section title="3. Objednávka a uzatvorenie zmluvy o dielo">
          <Points>
            <li>
              Odoslaním objednávky cez webové rozhranie a jej úhradou prostredníctvom platobnej
              brány Stripe (
              <a className="underline" href="https://stripe.com/en-sk" target="_blank" rel="noreferrer">
                https://stripe.com/en-sk
              </a>
              ) predkladá zákazník návrh na uzatvorenie zmluvy o dielo, rovnako tak aj odoslaním
              objednávky cez webové rozhranie a úhradou prevodom na účet. Odoslaním objednávky
              zákazník dostane e-mailom podklady k úhrade – (meno príjemcu, IBAN, SWIFT/BIC,
              názov banky, sumu, variabilný symbol). Objednávka sa považuje za prijatú až
              pripísaním peňazí na účet príjemcu.
            </li>
            <li>
              K uzatvoreniu zmluvy o dielo dochádza v momente, kedy zhotoviteľ potvrdí prijatie
              objednávky na e-mailovú adresu zákazníka. Od tohto momentu je zmluva záväzná.
            </li>
            <li>
              Zhotoviteľ si vyhradzuje právo kontaktovať zákazníka v prípade nejasností alebo
              od zmluvy odstúpiť (stornovať objednávku a vrátiť plnú sumu), ak po technickej
              analýze dodaného súboru zistí, že model je nevytlačiteľný, porušuje autorské práva
              tretích strán alebo presahuje technologické možnosti zariadení zhotoviteľa.
            </li>
          </Points>
        </Section>

        <Section title="4. Cena diela a platobné podmienky">
          <Points>
            <li>
              Výsledná cena diela je kalkulovaná automaticky na základe objemu modelu, spotreby
              materiálu, zvolených parametrov a odhadovaného času tlače.
            </li>
            <li>
              Cena diela sa hradí vopred (pred začatím výroby) bezhotovostne platobnou kartou
              cez poskytovateľa Stripe alebo prevodom na účet zhotoviteľa. Zhotoviteľ nie je
              povinný začať s vykonávaním diela (tlačou) pred úplným zaplatením ceny.
            </li>
            <li>
              Náklady na dopravu a balenie diela sú vyčíslené samostatne počas procesu checkoutu
              a pripočítavajú sa k cene diela.
            </li>
          </Points>
        </Section>

        <Section title="5. Dodanie a prevzatie diela">
          <Points>
            <li>
              Spôsob a cenu doručenia hotového diela si objednávateľ volí v procese objednávky
              z aktuálne dostupných možností.
            </li>
            <li>
              Termíny zhotovenia a dodania diela uvedené na webe sú orientačné. Keďže ide
              o individuálnu zákazkovú výrobu, lehota sa môže líšiť v závislosti od aktuálnej
              vyťaženosti tlačiarní, typu materiálu alebo technologickej náročnosti (dĺžky tlače)
              dodaného modelu.
            </li>
          </Points>
        </Section>

        <Section title="6. Špecifiká 3D tlače (Vlastnosti diela)">
          <Points>
            <li>
              Objednávateľ berie na vedomie, že dielo je zhotovené technológiou 3D tlače.
              Výsledný produkt zo svojej podstaty nie je dokonale hladkým odliatkom.
            </li>
            <li>
              Dielo môže vykazovať viditeľné vrstvy materiálu, drobné vizuálne odchýlky, stopy
              po technologických podperách alebo mierne rozmerové tolerancie typické pre zvolený
              materiál a technológiu. Tieto špecifiká sú prirodzenou vlastnosťou výrobného
              procesu a nepovažujú sa za vadu diela.
            </li>
          </Points>
        </Section>

        <Section title="7. Zodpovednosť za vady a reklamácie">
          <Points>
            <li>
              Zhotoviteľ zodpovedá za to, že dielo bude zhotovené podľa parametrov zadaných
              v objednávke (správny materiál, farba a kompletnosť tlače podľa dodaného súboru).
            </li>
            <li>
              Zhotoviteľ nezodpovedá za chyby diela, ktoré boli spôsobené nesprávnymi alebo
              chybne navrhnutými dátami v dodanom súbore, ktorý dodal objednávateľ (napr. príliš
              tenké steny, chybná geometria, zlá statika modelu).
            </li>
            <li>
              V prípade vady diela (napr. deformácia pri tlači, dodanie iného materiálu/farby)
              zákazník uplatní reklamáciu e-mailom. V e-maili uvedie číslo objednávky, popis vady
              a priloží fotodokumentáciu alebo videozáznam vadného diela.
            </li>
            <li>
              Oprávnená reklamácia bude riešená prioritne odstránením vady (novou tlačou),
              poskytnutím primeranej zľavy z ceny diela, alebo vrátením peňazí najneskôr
              do 30 dní.
            </li>
          </Points>
        </Section>

        <Section title="8. Nemožnosť odstúpenia od zmluvy bez uvedenia dôvodu">
          <Points>
            <li>
              Keďže predmetom zmluvy je zhotovenie diela – tovaru vyrobeného podľa osobitných
              požiadaviek spotrebiteľa a na mieru na základe ním dodaného digitálneho STL, OBJ,
              SVG súboru – objednávateľ nemá právo na odstúpenie od zmluvy bez uvedenia dôvodu
              do 14 dní od prevzatia veci v zmysle platných právnych predpisov o ochrane
              spotrebiteľa (vylúčenie práva na odstúpenie od zmluvy zo zákona, § 19 ods. 1
              písm. c), podľa ktorého spotrebiteľ nemôže odstúpiť od zmluvy uzavretej na diaľku
              alebo od zmluvy uzavretej mimo prevádzkových priestorov obchodníka, ktorej
              predmetom je dodanie tovaru vyrobeného podľa osobitných požiadaviek spotrebiteľa,
              tovaru vyrobeného na mieru alebo tovaru určeného osobitne pre jedného spotrebiteľa.)
            </li>
            <li>
              Akonáhle bola zmluva uzatvorená a bol spustený proces tlače, objednávku nie je
              možné zo strany objednávateľa – zákazníka stornovať ani zrušiť.
            </li>
          </Points>
        </Section>

        <Section title="9. Osobitné ustanovenia pre podnikateľské subjekty">
          <Points>
            <li>
              Ustanovenia tohto článku sa vzťahujú výhradne na zákazníkov, ktorí uzatvárajú
              zmluvu o dielo ako podnikateľské subjekty (fyzické a právnické osoby nakupujúce
              na IČO, resp. v rámci svojej podnikateľskej činnosti). Právne vzťahy medzi
              zhotoviteľom a objednávateľom – podnikateľom sa riadia príslušnými ustanoveniami
              zákona č. 513/1991 Zb. Obchodný zákonník v platnom znení.
            </li>
            <li>
              Na objednávateľa – podnikateľa sa nevzťahujú predpisy o ochrane spotrebiteľa
              (vrátane Zákona č. 108/2024 Z. z. o ochrane spotrebiteľa a o zmene a doplnení
              niektorých zákonov). Podnikateľ nemá za žiadnych okolností právo na odstúpenie
              od zmluvy bez uvedenia dôvodu.
            </li>
            <li>
              Podnikateľ je povinný zhotovené dielo prehliadnuť a skontrolovať jeho parametre
              a množstvo ihneď pri jeho prevzatí od prepravcu alebo pri osobnom odbere.
            </li>
            <li>
              Vady diela, ktoré je možné zistiť pri prevzatí (zjavné vady, množstevné rozdiely,
              nesprávna farba či materiál), musia byť zhotoviteľovi písomne (e-mailom) oznámené
              najneskôr do 5 pracovných dní od prevzatia diela. Na neskoršie reklamácie zjavných
              vád sa nebude prihliadať a právo podnikateľa z vadného plnenia zaniká.
            </li>
            <li>
              Na zmluvný vzťah s podnikateľom sa nevzťahuje zákonná 30-dňová lehota na vybavenie
              reklamácie. Zhotoviteľ sa zaväzuje rozhodnúť o reklamácii podnikateľa a odstrániť
              prípadné vady v primeranej lehote, spravidla 14 dní od riadneho uplatnenia
              reklamácie, v závislosti od technologickej náročnosti novej tlače a kapacitných
              možností.
            </li>
            <li>
              V prípade oprávnenej reklamácie má zhotoviteľ výhradné právo voľby, či vadu
              odstráni novým zhotovením diela alebo poskytne primeranú zľavu z ceny. Podnikateľ
              nemá právo požadovať vrátenie peňazí (odstúpenie od zmluvy), pokiaľ sa zmluvné
              strany nedohodnú inak.
            </li>
            <li>
              Zhotoviteľ nezodpovedá za žiadne nepriame, náhodné alebo následné škody, ušlý zisk,
              stratu produkcie alebo obratu, ktoré podnikateľovi vzniknú v dôsledku vád diela
              alebo oneskorenia s jeho dodaním. Celková zodpovednosť zhotoviteľa za akúkoľvek
              škodu je obmedzená maximálne do výšky ceny, ktorú podnikateľ za dané dielo
              skutočne zaplatil.
            </li>
            <li>
              Akákoľvek zmena alebo storno objednávky po uzatvorení zmluvy je zo strany
              podnikateľa možná len s písomným súhlasom zhotoviteľa a po uhradení storno poplatku
              vo výške 5 % z ceny diela, ak už bol proces 3D tlače spustený.
            </li>
          </Points>
        </Section>

        <Section title="10. Ochrana osobných údajov">
          <Points>
            <li>
              Informácie o spracúvaní osobných údajov sú uvedené na stránke{" "}
              <a className="underline" href="/gdpr">
                GDPR
              </a>
              .
            </li>
          </Points>
        </Section>

        <Section title="11. Záverečné ustanovenia">
          <Points>
            <li>
              Tieto všeobecné obchodné podmienky a všetky zmluvy uzavreté na ich základe sa
              riadia právnymi predpismi platnými v Slovenskej republike.
            </li>
            <li>
              V zmysle zákona č. 391/2015 Z. z. o alternatívnom riešení spotrebiteľských sporov
              a o zmene a doplnení niektorých zákonov a podľa Čl. 14 ods. 1 a 2 nariadenia
              Európskeho parlamentu a Rady (EÚ) č. 524/2013 z 21. mája 2013 o riešení
              spotrebiteľských sporov online, ktorým sa mení nariadenie (ES) č. 2006/2004
              a smernica 2009/22/ES (nariadenie o riešení spotrebiteľských sporov online)
              (Ú. v. EÚ L 165, 18. 6. 2013), má kupujúci možnosť riešiť spor prostredníctvom
              systému alternatívneho riešenia sporov.
              <br />
              Orgánom alternatívneho riešenia sporov je zo zákona aj Slovenská obchodná
              inšpekcia.
              <br />
              Odkaz na zoznam subjektov alternatívneho riešenia spotrebiteľských sporov:{" "}
              <a
                className="break-words underline"
                href="https://www.mhsr.sk/obchod/ochrana-spotrebitela/alternativne-riesenie-spotrebitelskych-sporov-1/zoznam-subjektov-alternativneho-riesenia-spotrebitelskych-sporov-1"
                target="_blank"
                rel="noreferrer"
              >
                https://www.mhsr.sk/obchod/ochrana-spotrebitela/alternativne-riesenie-spotrebitelskych-sporov-1/zoznam-subjektov-alternativneho-riesenia-spotrebitelskych-sporov-1
              </a>
            </li>
          </Points>
        </Section>

        <p className="mt-10 text-sm font-normal text-neutral-600">
          V Bratislave, dňa {updated}
        </p>
      </div>
    </main>
  );
}
