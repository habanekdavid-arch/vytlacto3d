// @ts-nocheck
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const blogPosts = [
  {
    slug: "kolko-stoji-3d-tlac",
    title: "Koľko stojí 3D tlač?",
    subtitle: "Kompletný prehľad cien, faktorov a možností",
    description:
      "Zistite, koľko stojí 3D tlač na mieru, čo ovplyvňuje cenu 3D tlače a aké sú reálne ceny za 3D tlač modelov, prototypov a náhradných dielov.",
    image: "/blog/kolko-stoji-3d-tlac.jpg",
    publishedAt: "2026-04-01",
    readingTime: "6 min",
    featured: true,
    cta: "Máte model, nápad alebo problém, ktorý treba vyriešiť? Nahrajte ho do konfigurátora a zistite cenu 3D tlače.",
    sections: [
      { heading: "3D tlač je dnes dostupnejšia ako kedykoľvek predtým", paragraphs: ["3D tlač sa za posledné roky stala jednou z najdostupnejších technológií výroby. To, čo bolo kedysi možné len vo veľkých fabrikách, dnes zvládne moderná 3D tlačiareň rýchlo, presne a za rozumnú cenu.", "Aj preto sa čoraz viac ľudí pýta: koľko stojí 3D tlač na mieru? Odpoveď nie je úplne jednoduchá, ale v tomto článku vám vysvetlíme, čo všetko cenu 3D tlače ovplyvňuje a ako si spraviť reálnu predstavu o rozpočte."] },
      { heading: "Prečo neexistuje jedna univerzálna cena", paragraphs: ["Na rozdiel od bežných produktov nemá 3D tlač fixnú cenu. Každý výrobok je unikát – a práve to je jej najväčšia výhoda.", "Cena 3D tlače sa vždy počíta individuálne podľa konkrétneho modelu, materiálu, veľkosti, času tlače a požadovaného výsledku. Jednoducho povedané: platíte len za to, čo si necháte vyrobiť."] },
      { heading: "5 hlavných faktorov, ktoré ovplyvňujú cenu 3D tlače", bullets: ["Veľkosť a objem modelu – viac materiálu znamená vyššiu cenu.", "Typ materiálu – PLA, PETG, ABS alebo TPU majú rozdielne vlastnosti aj cenu.", "Čas tlače – čím dlhšie sa model tlačí, tým viac rastie cena výroby.", "Zložitosť modelu – detaily, presnosť a podpery zvyšujú náročnosť výroby.", "Post-processing – brúsenie, lepenie, lakovanie alebo finálne úpravy zvyšujú hodnotu hotového produktu."] },
      { heading: "Reálne príklady cien 3D tlače", bullets: ["malý držiak alebo jednoduchý diel: 5 – 15 €", "väčší technický diel: 20 – 60 €", "dekorácia alebo darček: 15 – 50 €", "komplexný model alebo prototyp: 50 – 150 €+"] },
      { heading: "Zhrnutie", paragraphs: ["3D tlač je flexibilná, rýchla a dostupná forma výroby. Cena 3D tlače závisí od konkrétneho projektu, ale možnosti sú takmer neobmedzené.", "Ak chcete zistiť presnú cenu 3D tlače pre váš model, najlepšie je nahrať model alebo poslať zadanie a nechať si pripraviť konkrétnu ponuku."] },
    ],
  },
  {
    slug: "materialy-na-3d-tlac-pla-petg-abs-tpu",
    title: "Aký materiál vybrať na 3D tlač?",
    subtitle: "PLA, PETG, ABS a TPU – výhody, nevýhody a použitie",
    description: "Neviete, aký materiál zvoliť na 3D tlač? Porovnanie PLA, PETG, ABS a TPU – vlastnosti, použitie, odolnosť a vhodnosť pre rôzne 3D modely a náhradné diely.",
    image: "/blog/materialy-na-3d-tlac-pla-petg-abs-tpu.jpg",
    publishedAt: "2026-04-02",
    readingTime: "7 min",
    featured: false,
    cta: "Neviete, ktorý materiál je pre váš model najlepší? Nahrajte model a vyberieme vhodný filament podľa použitia.",
    sections: [
      { heading: "Výber materiálu rozhoduje o výsledku", paragraphs: ["Pri 3D tlači nerozhoduje len tvar modelu, ale aj správny materiál. To, aký filament vyberiete, ovplyvní pevnosť, vzhľad, odolnosť voči teplu, pružnosť aj celkovú cenu 3D tlače.", "Najčastejšie používané materiály na FDM 3D tlač sú PLA, PETG, ABS a TPU. Každý z nich sa hodí na iný typ výrobku."] },
      { heading: "PLA – najlepšia voľba pre bežnú 3D tlač", bullets: ["výhody: jednoduchá tlač, pekný vzhľad, priaznivá cena", "nevýhody: nižšia odolnosť voči teplu a nárazu", "vhodné použitie: dekorácie, držiaky, prototypy, menšie funkčné diely"] },
      { heading: "PETG – pevnejší a odolnejší materiál", bullets: ["výhody: vyššia pevnosť, odolnosť, dobrá životnosť", "nevýhody: o niečo náročnejšia tlač než PLA", "vhodné použitie: technické diely, držiaky, kryty, funkčné komponenty"] },
      { heading: "ABS – technický materiál pre náročnejšie použitie", bullets: ["výhody: vyššia tepelná odolnosť, technické využitie", "nevýhody: náročnejšia tlač, citlivosť na deformácie pri tlači", "vhodné použitie: technické diely, súčiastky, robustnejšie komponenty"] },
      { heading: "TPU – pružný filament", bullets: ["výhody: flexibilita, pružnosť, odolnosť proti opotrebeniu", "nevýhody: pomalšia a náročnejšia tlač", "vhodné použitie: pružné diely, krytky, ochranné prvky, tesnenia"] },
      { heading: "Ktorý materiál je najlepší na 3D tlač?", paragraphs: ["Neexistuje jeden univerzálne najlepší materiál. Najlepší materiál na 3D tlač závisí od toho, čo potrebujete vyrobiť.", "Ak chcete pekný a cenovo dostupný výtlačok, voľte PLA. Ak potrebujete odolnejší funkčný diel, siahnite po PETG. Ak riešite technickú súčiastku s vyššími nárokmi, zaujímavý môže byť ABS. A ak musí byť model pružný, správna voľba je TPU."] },
    ],
  },
  {
    slug: "priprava-stl-suboru-na-3d-tlac",
    title: "Ako pripraviť STL súbor na 3D tlač",
    subtitle: "7 najčastejších chýb pri STL modeli a ako sa im vyhnúť",
    description: "Pripravujete STL súbor na 3D tlač? Zistite, ako pripraviť 3D model správne, aké chyby spôsobujú problémy pri tlači a ako získať kvalitný výsledok bez zbytočných komplikácií.",
    image: "/blog/priprava-stl-suboru-na-3d-tlac.jpg",
    publishedAt: "2026-04-03",
    readingTime: "8 min",
    featured: false,
    cta: "Máte STL súbor a neviete, či je pripravený správne? Nahrajte ho do konfigurátora a overte si rozmery, objem aj cenu výroby.",
    sections: [
      { heading: "Prečo je kvalitný STL súbor taký dôležitý", paragraphs: ["Aj najlepšia 3D tlačiareň potrebuje dobrý vstup. Ak je STL súbor zle pripravený, môže dôjsť k chybám v tlači, nepresnostiam, zlej kvalite povrchu alebo dokonca k zlyhaniu celej objednávky.", "Preto sa oplatí vedieť, ako pripraviť STL model na 3D tlač správne ešte pred nahraním do konfigurátora."] },
      { heading: "Najčastejšie chyby v STL súbore", bullets: ["nesprávna mierka modelu", "neuzavretý model alebo poškodená mesh sieť", "príliš tenké steny", "zbytočne komplikovaná geometria", "zlá orientácia modelu", "zbytočne ťažký model", "export bez kontroly rozmerov a objemu"] },
      { heading: "Ako pripraviť 3D model správne", bullets: ["pracovať v milimetroch", "skontrolovať rozmery modelu", "overiť uzavretú geometriu", "vyhnúť sa príliš tenkým stenám", "myslieť na orientáciu a použitie modelu", "pred exportom skontrolovať finálny STL súbor"] },
      { heading: "Zhrnutie", paragraphs: ["Správne pripravený STL súbor znamená menej problémov, presnejší výpočet ceny a lepší finálny výsledok.", "Ak si nie ste istí, či je váš model pripravený správne, radi sa naň pozrieme a odporučíme najvhodnejšie riešenie."] },
    ],
  },
  {
    slug: "3d-tlac-pre-vyrobu-prototypy",
    title: "3D tlač pre výrobu: prečo riešiť prototypy cez 3D tlač",
    subtitle: "Rýchle prototypovanie, technické diely a výroba bez zbytočných nákladov",
    description: "3D tlač pre firmy a výrobu: prečo riešiť prototypy cez 3D tlač, kedy sa oplatí výroba plastových dielov na mieru a prečo je 3D tlač ideálna pre vývoj produktov a technické riešenia.",
    image: "/blog/3d-tlac-pre-vyrobu-prototypy.jpg",
    publishedAt: "2026-04-08",
    readingTime: "7 min",
    featured: false,
    cta: "Vyvíjate produkt, testujete diel alebo riešite problém vo výrobe? Pošlite nám zadanie a pripravíme vám prototyp alebo technické riešenie na mieru.",
    sections: [
      { heading: "Prečo firmy riešia prototypy cez 3D tlač", paragraphs: ["Ak firma vyvíja nový produkt alebo rieši technický problém vo výrobe, väčšinou narazí na rovnakú bariéru: potrebuje niečo otestovať, ale výroba je pomalá, drahá alebo nepružná.", "A práve tu vzniká priestor pre 3D tlač prototypov. Rýchle prototypovanie cez 3D tlač umožňuje otestovať riešenie bez zbytočných investícií do nástrojov, foriem alebo zdĺhavej externej výroby."] },
      { heading: "Prototyp nie je cieľ. Je to nástroj na rozhodnutie.", paragraphs: ["Najväčšia chyba, ktorú pri firmách vidíme, je v tom, že prototyp berú len ako medzikrok. V realite je to však jeden z najdôležitejších momentov celého vývoja produktu.", "Ak máte prototyp v ruke, viete ho fyzicky posúdiť, viete ho otestovať v reálnych podmienkach a viete odhaliť chyby skôr, než budú stáť tisíce eur."], bullets: ["viete ho chytiť do ruky", "viete ho otestovať v reálnych podmienkach", "viete odhaliť chyby skôr, než budú drahé"] },
      { heading: "Prečo 3D tlač a nie klasická výroba prototypov", paragraphs: ["Klasická výroba prototypov cez CNC, formy alebo externé dielne býva nastavená skôr na finálny produkt než na rýchly vývoj.", "Pri 3D tlači fungujete úplne inak. Upravíte model, vytlačíte ho znova, otestujete, zmeníte a pokračujete ďalej."], bullets: ["nižšie vstupné náklady", "rýchlejšie iterácie", "žiadne formy a minimálne fixné náklady", "vhodné pre vývoj, nie len finálnu sériu"] },
      { heading: "Keď prototyp prechádza do reality", paragraphs: ["Veľkou výhodou je, že 3D tlač pre výrobu dnes nie je len o vizuálnych modeloch. V mnohých prípadoch ide o funkčné technické diely, komponenty, prípravky, držiaky alebo interné výrobné pomôcky.", "To znamená, že to, čo dnes testujete ako prototyp, môžete zajtra reálne používať vo výrobe."] },
      { heading: "Zhrnutie", paragraphs: ["3D tlač pre firmy dáva zmysel všade tam, kde potrebujete rýchlosť, flexibilitu a funkčný výsledok.", "Ak potrebujete prototyp, technický diel alebo výrobu plastových dielov na mieru, radi vám pomôžeme nájsť riešenie, ktoré nebude len vytlačené, ale aj použiteľné v praxi."] },
    ],
  },
];

const realizacie = [
  {
    slug: "technicky-prototyp",
    title: "Technický prototyp",
    subtitle: "3D tlač prototypov pre vývoj, testovanie a výrobu",
    description: "Funkčný technický prototyp vytvorený pomocou 3D tlače na overenie rozmerov, tvaru, pevnosti a použitia pred finálnou výrobou.",
    image: "/realizacie/technicky-prototyp.jpg",
    category: "Prototypovanie", year: "2026", material: "PLA / PETG", size: "podľa zadania", leadTime: "2 – 4 dni", featured: true,
    seoKeywords: ["3D tlač prototypov", "technický prototyp", "výroba prototypov", "3D prototyp na mieru", "prototypovanie produktov", "rýchla výroba prototypu"],
    content: [
      { heading: "3D tlač technických prototypov", paragraphs: ["Technický prototyp je ideálny spôsob, ako rýchlo overiť nový produkt, diel alebo konštrukčné riešenie ešte pred sériovou výrobou. Vďaka 3D tlači je možné získať fyzický model bez drahých foriem, nástrojov alebo dlhých dodacích lehôt.", "Takáto realizácia je vhodná pre firmy, vývojárov, dizajnérov, technické oddelenia aj jednotlivcov, ktorí potrebujú otestovať rozmery, tvar, uchytenie alebo funkčnosť dielu v praxi."] },
      { heading: "Výhoda oproti klasickej výrobe", paragraphs: ["Pri klasickej výrobe prototypu môžu byť vstupné náklady vysoké. 3D tlač umožňuje vyrobiť jeden kus, upraviť model a následne rýchlo vytlačiť ďalšiu verziu.", "To výrazne zrýchľuje vývoj produktu a pomáha odhaliť chyby skôr, než vzniknú náklady pri finálnej výrobe."] },
      { heading: "Pre koho je tento typ realizácie vhodný", paragraphs: ["3D tlač prototypov odporúčame najmä firmám, startupom, výrobcom, konštruktérom a každému, kto potrebuje rýchlo dostať nápad z digitálneho návrhu do fyzickej podoby.", "Prototyp je možné použiť na interné testovanie, prezentáciu klientovi, overenie ergonómie alebo ako prvý krok pred malosériovou výrobou."] },
    ],
  },
  {
    slug: "drziak-na-mieru",
    title: "Držiak na mieru",
    subtitle: "3D tlačený držiak presne podľa použitia zákazníka",
    description: "Praktický držiak na mieru vytvorený pomocou 3D tlače pre konkrétne rozmery, uchytenie a funkčné použitie.",
    image: "/realizacie/drziak-na-mieru.jpg",
    category: "Diel na mieru", year: "2026", material: "PETG", size: "kompaktný diel", leadTime: "1 – 3 dni", featured: false,
    seoKeywords: ["3D tlač držiaka", "držiak na mieru", "plastový držiak na mieru", "3D tlačený úchyt", "výroba držiakov", "diel na mieru 3D tlač"],
    content: [
      { heading: "Držiak na mieru pomocou 3D tlače", paragraphs: ["Držiaky, úchyty a rôzne praktické diely patria medzi najčastejšie využitia 3D tlače. Bežne dostupné riešenia často nesedia rozmermi, tvarom alebo spôsobom uchytenia.", "Vďaka 3D tlači je možné vyrobiť presne taký držiak, aký zákazník potrebuje — či už ide o domácnosť, dielňu, kanceláriu, výrobu alebo technické zariadenie."] },
      { heading: "Presné rozmery a funkčné použitie", paragraphs: ["Pri výrobe držiaka na mieru sa zameriavame na rozmery, pevnosť, spôsob montáže a reálne použitie dielu. Materiál PETG je vhodný pre funkčné diely, pretože ponúka dobrú pevnosť a vyššiu odolnosť.", "Takýto diel sa dá vyrobiť už od jedného kusu a v prípade potreby jednoducho upraviť podľa spätnej väzby."] },
      { heading: "Ideálne riešenie pre individuálne potreby", paragraphs: ["3D tlač držiakov je vhodná vtedy, keď neexistuje hotový produkt, ktorý by presne vyhovoval vašej situácii.", "Môže ísť o úchyt, konzolu, adaptér, montážny prvok alebo špecifický diel, ktorý musí zapadnúť do konkrétneho priestoru."] },
    ],
  },
  {
    slug: "produktovy-model",
    title: "Produktový model",
    subtitle: "3D tlač produktového dizajnu pre prezentáciu a vývoj",
    description: "Produktový model vytvorený pomocou 3D tlače na overenie dizajnu, proporcií, ergonómie a prezentáciu produktu.",
    image: "/realizacie/produktovy-model.jpg",
    category: "Produktový dizajn", year: "2026", material: "PLA", size: "prezentačný model", leadTime: "2 – 5 dní", featured: false,
    seoKeywords: ["3D tlač produktového modelu", "produktový dizajn 3D tlač", "prezentačný model", "3D model produktu", "vývoj produktu", "prototyp produktu"],
    content: [
      { heading: "3D tlač produktového modelu", paragraphs: ["Produktový model pomáha overiť, ako bude návrh pôsobiť v reálnom svete. Digitálny 3D model na obrazovke často nestačí na posúdenie proporcií, veľkosti a celkového dojmu.", "Vytlačený model umožňuje produkt fyzicky chytiť do ruky, ukázať klientovi alebo použiť pri prezentácii pred výrobou finálnej verzie."] },
      { heading: "Využitie pri vývoji produktov", paragraphs: ["3D tlač produktového dizajnu je vhodná pri vývoji nových výrobkov, obalov, doplnkov, technických prvkov aj dizajnových objektov.", "Pomáha rýchlo porovnať viac variantov a rozhodnúť sa, ktorý tvar, veľkosť alebo detail funguje najlepšie."] },
      { heading: "Prezentácia a testovanie", paragraphs: ["Produktový model môže slúžiť ako prezentačný vzor, interný vývojový model alebo pomôcka pri komunikácii s investorom, klientom či výrobným partnerom.", "Výhodou je rýchla výroba, nižšie náklady a možnosť opakovanej úpravy návrhu."] },
    ],
  },
  {
    slug: "nahradny-diel",
    title: "Náhradný diel",
    subtitle: "3D tlač náhradných dielov, ktoré už nie sú dostupné",
    description: "Výroba plastového náhradného dielu pomocou 3D tlače podľa pôvodného kusu, fotky, rozmerov alebo technického zadania.",
    image: "/realizacie/nahradny-diel.jpg",
    category: "Náhradné diely", year: "2026", material: "PETG / ABS", size: "podľa dielu", leadTime: "2 – 4 dni", featured: true,
    seoKeywords: ["3D tlač náhradných dielov", "náhradný diel na mieru", "plastový náhradný diel", "výroba náhradného dielu", "3D tlač plastových dielov", "oprava plastového dielu"],
    content: [
      { heading: "3D tlač náhradných dielov", paragraphs: ["Náhradné diely sú jednou z najpraktickejších oblastí využitia 3D tlače. Často sa stáva, že pôvodný plastový diel sa zlomí, stratí alebo sa už nedá kúpiť ako samostatný náhradný diel.", "V takom prípade je možné diel znovu vyrobiť pomocou 3D tlače podľa pôvodného kusu, fotiek, rozmerov alebo technického návrhu."] },
      { heading: "Kedy sa oplatí 3D tlač náhradného dielu", paragraphs: ["3D tlač náhradného dielu sa oplatí najmä vtedy, keď originálny diel nie je dostupný, jeho dodanie je príliš drahé alebo by bolo nutné kúpiť celý nový výrobok.", "Vyrobiť sa dajú krytky, držiaky, úchyty, kolieska, adaptéry, mechanické časti a rôzne plastové komponenty."] },
      { heading: "Materiál podľa použitia", paragraphs: ["Pre funkčné náhradné diely často odporúčame PETG alebo ABS podľa toho, či bude diel vystavený mechanickému zaťaženiu, teplu alebo vonkajšiemu prostrediu.", "Pri každej zákazke posudzujeme, aký materiál bude najvhodnejší pre reálne použitie dielu."] },
    ],
  },
  {
    slug: "firemna-zakazka",
    title: "Firemná zákazka",
    subtitle: "3D tlač pre firmy, výrobu a malosériové diely",
    description: "Firemná zákazka zameraná na 3D tlač dielov pre interné technické riešenia, prototypovanie, prípravky alebo malosériovú výrobu.",
    image: "/realizacie/firemna-zakazka.jpg",
    category: "Firemná výroba", year: "2026", material: "PLA / PETG / ABS", size: "maloséria", leadTime: "individuálne", featured: false,
    seoKeywords: ["3D tlač pre firmy", "firemná 3D tlač", "malosériová výroba 3D tlač", "3D tlač technických dielov", "výroba plastových dielov", "3D tlač pre výrobu"],
    content: [
      { heading: "3D tlač pre firmy", paragraphs: ["Firemné zákazky v 3D tlači sú vhodné pre výrobu, údržbu, vývoj produktov, marketing aj interné technické riešenia.", "Firmy často potrebujú rýchlo vyrobiť prototyp, prípravok, držiak, kryt, adaptér alebo menšiu sériu plastových dielov bez investície do foriem."] },
      { heading: "Malosériová výroba bez foriem", paragraphs: ["Pri menších sériách môže byť klasická výroba neefektívna. 3D tlač umožňuje vyrábať od jedného kusu až po malé série bez vysokých vstupných nákladov.", "Diely je možné priebežne upravovať, optimalizovať a vyrábať podľa aktuálnej potreby firmy."] },
      { heading: "Technické diely a interné riešenia", paragraphs: ["3D tlač pre firmy je vhodná aj na výrobu pomocných prípravkov, montážnych pomôcok, ochranných krytov, úchytov alebo špeciálnych dielov do výroby.", "Výhodou je rýchlosť, flexibilita a možnosť prispôsobiť každý diel presne konkrétnemu použitiu."] },
    ],
  },
  {
    slug: "dizajnovy-objekt",
    title: "Dizajnový objekt",
    subtitle: "3D tlač dizajnových a dekoratívnych objektov na mieru",
    description: "Dizajnový 3D objekt vytvorený na mieru s dôrazom na tvar, detail, estetiku a výsledný vizuálny dojem.",
    image: "/realizacie/dizajnovy-objekt.jpg",
    category: "Dizajn", year: "2026", material: "PLA", size: "dekoratívny objekt", leadTime: "2 – 5 dní", featured: false,
    seoKeywords: ["3D tlač dizajnových objektov", "dekorácia na mieru", "3D tlačený darček", "dizajnový objekt 3D tlač", "originálny 3D výtlačok", "3D tlač dekorácií"],
    content: [
      { heading: "Dizajnové objekty z 3D tlače", paragraphs: ["3D tlač umožňuje vytvárať dizajnové objekty, dekorácie a originálne tvary, ktoré by bolo náročné alebo drahé vyrobiť klasickými technológiami.", "Takýto objekt môže slúžiť ako dekorácia, darček, prezentačný prvok, umelecký doplnok alebo personalizovaný výrobok."] },
      { heading: "Tvar, detail a vizuálny dojem", paragraphs: ["Pri dizajnových realizáciách je dôležitý nielen samotný tvar, ale aj proporcie, povrch, farba a celkové prevedenie.", "3D tlač umožňuje rýchlo testovať rôzne varianty dizajnu a pripraviť finálny objekt podľa predstavy zákazníka."] },
      { heading: "Personalizovaná výroba", paragraphs: ["Dizajnový objekt môže byť upravený podľa konkrétneho zadania — napríklad tvarom, rozmerom, farbou alebo textom.", "Vďaka tomu je 3D tlač vhodná aj na originálne darčeky, prototypy dizajnových produktov alebo firemné prezentačné predmety."] },
    ],
  },
];

async function main() {
  console.log("Seeding blog posts...");
  for (const post of blogPosts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {},
      create: { ...post, published: true },
    });
    console.log("  ✓", post.slug);
  }
  console.log("Seeding realizacie...");
  for (const item of realizacie) {
    await prisma.realizacia.upsert({
      where: { slug: item.slug },
      update: {},
      create: { ...item, published: true },
    });
    console.log("  ✓", item.slug);
  }
  console.log("Done!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
