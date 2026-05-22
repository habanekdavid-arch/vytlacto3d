export type Realization = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  category: string;
  year: string;
  material: string;
  size: string;
  leadTime: string;
  seoKeywords: string[];
  featured?: boolean;
  content: {
    heading: string;
    paragraphs: string[];
  }[];
};

export const realizacie: Realization[] = [
  {
    slug: "technicky-prototyp",
    title: "Technický prototyp",
    subtitle: "3D tlač prototypov pre vývoj, testovanie a výrobu",
    description:
      "Funkčný technický prototyp vytvorený pomocou 3D tlače na overenie rozmerov, tvaru, pevnosti a použitia pred finálnou výrobou.",
    image: "/realizacie/technicky-prototyp.jpg",
    category: "Prototypovanie",
    year: "2026",
    material: "PLA / PETG",
    size: "podľa zadania",
    leadTime: "2 – 4 dni",
    featured: true,
    seoKeywords: [
      "3D tlač prototypov",
      "technický prototyp",
      "výroba prototypov",
      "3D prototyp na mieru",
      "prototypovanie produktov",
      "rýchla výroba prototypu",
    ],
    content: [
      {
        heading: "3D tlač technických prototypov",
        paragraphs: [
          "Technický prototyp je ideálny spôsob, ako rýchlo overiť nový produkt, diel alebo konštrukčné riešenie ešte pred sériovou výrobou. Vďaka 3D tlači je možné získať fyzický model bez drahých foriem, nástrojov alebo dlhých dodacích lehôt.",
          "Takáto realizácia je vhodná pre firmy, vývojárov, dizajnérov, technické oddelenia aj jednotlivcov, ktorí potrebujú otestovať rozmery, tvar, uchytenie alebo funkčnosť dielu v praxi.",
        ],
      },
      {
        heading: "Výhoda oproti klasickej výrobe",
        paragraphs: [
          "Pri klasickej výrobe prototypu môžu byť vstupné náklady vysoké. 3D tlač umožňuje vyrobiť jeden kus, upraviť model a následne rýchlo vytlačiť ďalšiu verziu.",
          "To výrazne zrýchľuje vývoj produktu a pomáha odhaliť chyby skôr, než vzniknú náklady pri finálnej výrobe.",
        ],
      },
      {
        heading: "Pre koho je tento typ realizácie vhodný",
        paragraphs: [
          "3D tlač prototypov odporúčame najmä firmám, startupom, výrobcom, konštruktérom a každému, kto potrebuje rýchlo dostať nápad z digitálneho návrhu do fyzickej podoby.",
          "Prototyp je možné použiť na interné testovanie, prezentáciu klientovi, overenie ergonómie alebo ako prvý krok pred malosériovou výrobou.",
        ],
      },
    ],
  },

  {
    slug: "drziak-na-mieru",
    title: "Držiak na mieru",
    subtitle: "3D tlačený držiak presne podľa použitia zákazníka",
    description:
      "Praktický držiak na mieru vytvorený pomocou 3D tlače pre konkrétne rozmery, uchytenie a funkčné použitie.",
    image: "/realizacie/drziak-na-mieru.jpg",
    category: "Diel na mieru",
    year: "2026",
    material: "PETG",
    size: "kompaktný diel",
    leadTime: "1 – 3 dni",
    seoKeywords: [
      "3D tlač držiaka",
      "držiak na mieru",
      "plastový držiak na mieru",
      "3D tlačený úchyt",
      "výroba držiakov",
      "diel na mieru 3D tlač",
    ],
    content: [
      {
        heading: "Držiak na mieru pomocou 3D tlače",
        paragraphs: [
          "Držiaky, úchyty a rôzne praktické diely patria medzi najčastejšie využitia 3D tlače. Bežne dostupné riešenia často nesedia rozmermi, tvarom alebo spôsobom uchytenia.",
          "Vďaka 3D tlači je možné vyrobiť presne taký držiak, aký zákazník potrebuje — či už ide o domácnosť, dielňu, kanceláriu, výrobu alebo technické zariadenie.",
        ],
      },
      {
        heading: "Presné rozmery a funkčné použitie",
        paragraphs: [
          "Pri výrobe držiaka na mieru sa zameriavame na rozmery, pevnosť, spôsob montáže a reálne použitie dielu. Materiál PETG je vhodný pre funkčné diely, pretože ponúka dobrú pevnosť a vyššiu odolnosť.",
          "Takýto diel sa dá vyrobiť už od jedného kusu a v prípade potreby jednoducho upraviť podľa spätnej väzby.",
        ],
      },
      {
        heading: "Ideálne riešenie pre individuálne potreby",
        paragraphs: [
          "3D tlač držiakov je vhodná vtedy, keď neexistuje hotový produkt, ktorý by presne vyhovoval vašej situácii.",
          "Môže ísť o úchyt, konzolu, adaptér, montážny prvok alebo špecifický diel, ktorý musí zapadnúť do konkrétneho priestoru.",
        ],
      },
    ],
  },

  {
    slug: "produktovy-model",
    title: "Produktový model",
    subtitle: "3D tlač produktového dizajnu pre prezentáciu a vývoj",
    description:
      "Produktový model vytvorený pomocou 3D tlače na overenie dizajnu, proporcií, ergonómie a prezentáciu produktu.",
    image: "/realizacie/produktovy-model.jpg",
    category: "Produktový dizajn",
    year: "2026",
    material: "PLA",
    size: "prezentačný model",
    leadTime: "2 – 5 dní",
    seoKeywords: [
      "3D tlač produktového modelu",
      "produktový dizajn 3D tlač",
      "prezentačný model",
      "3D model produktu",
      "vývoj produktu",
      "prototyp produktu",
    ],
    content: [
      {
        heading: "3D tlač produktového modelu",
        paragraphs: [
          "Produktový model pomáha overiť, ako bude návrh pôsobiť v reálnom svete. Digitálny 3D model na obrazovke často nestačí na posúdenie proporcií, veľkosti a celkového dojmu.",
          "Vytlačený model umožňuje produkt fyzicky chytiť do ruky, ukázať klientovi alebo použiť pri prezentácii pred výrobou finálnej verzie.",
        ],
      },
      {
        heading: "Využitie pri vývoji produktov",
        paragraphs: [
          "3D tlač produktového dizajnu je vhodná pri vývoji nových výrobkov, obalov, doplnkov, technických prvkov aj dizajnových objektov.",
          "Pomáha rýchlo porovnať viac variantov a rozhodnúť sa, ktorý tvar, veľkosť alebo detail funguje najlepšie.",
        ],
      },
      {
        heading: "Prezentácia a testovanie",
        paragraphs: [
          "Produktový model môže slúžiť ako prezentačný vzor, interný vývojový model alebo pomôcka pri komunikácii s investorom, klientom či výrobným partnerom.",
          "Výhodou je rýchla výroba, nižšie náklady a možnosť opakovanej úpravy návrhu.",
        ],
      },
    ],
  },

  {
    slug: "nahradny-diel",
    title: "Náhradný diel",
    subtitle: "3D tlač náhradných dielov, ktoré už nie sú dostupné",
    description:
      "Výroba plastového náhradného dielu pomocou 3D tlače podľa pôvodného kusu, fotky, rozmerov alebo technického zadania.",
    image: "/realizacie/nahradny-diel.jpg",
    category: "Náhradné diely",
    year: "2026",
    material: "PETG / ABS",
    size: "podľa dielu",
    leadTime: "2 – 4 dni",
    featured: true,
    seoKeywords: [
      "3D tlač náhradných dielov",
      "náhradný diel na mieru",
      "plastový náhradný diel",
      "výroba náhradného dielu",
      "3D tlač plastových dielov",
      "oprava plastového dielu",
    ],
    content: [
      {
        heading: "3D tlač náhradných dielov",
        paragraphs: [
          "Náhradné diely sú jednou z najpraktickejších oblastí využitia 3D tlače. Často sa stáva, že pôvodný plastový diel sa zlomí, stratí alebo sa už nedá kúpiť ako samostatný náhradný diel.",
          "V takom prípade je možné diel znovu vyrobiť pomocou 3D tlače podľa pôvodného kusu, fotiek, rozmerov alebo technického návrhu.",
        ],
      },
      {
        heading: "Kedy sa oplatí 3D tlač náhradného dielu",
        paragraphs: [
          "3D tlač náhradného dielu sa oplatí najmä vtedy, keď originálny diel nie je dostupný, jeho dodanie je príliš drahé alebo by bolo nutné kúpiť celý nový výrobok.",
          "Vyrobiť sa dajú krytky, držiaky, úchyty, kolieska, adaptéry, mechanické časti a rôzne plastové komponenty.",
        ],
      },
      {
        heading: "Materiál podľa použitia",
        paragraphs: [
          "Pre funkčné náhradné diely často odporúčame PETG alebo ABS podľa toho, či bude diel vystavený mechanickému zaťaženiu, teplu alebo vonkajšiemu prostrediu.",
          "Pri každej zákazke posudzujeme, aký materiál bude najvhodnejší pre reálne použitie dielu.",
        ],
      },
    ],
  },

  {
    slug: "firemna-zakazka",
    title: "Firemná zákazka",
    subtitle: "3D tlač pre firmy, výrobu a malosériové diely",
    description:
      "Firemná zákazka zameraná na 3D tlač dielov pre interné technické riešenia, prototypovanie, prípravky alebo malosériovú výrobu.",
    image: "/realizacie/firemna-zakazka.jpg",
    category: "Firemná výroba",
    year: "2026",
    material: "PLA / PETG / ABS",
    size: "maloséria",
    leadTime: "individuálne",
    seoKeywords: [
      "3D tlač pre firmy",
      "firemná 3D tlač",
      "malosériová výroba 3D tlač",
      "3D tlač technických dielov",
      "výroba plastových dielov",
      "3D tlač pre výrobu",
    ],
    content: [
      {
        heading: "3D tlač pre firmy",
        paragraphs: [
          "Firemné zákazky v 3D tlači sú vhodné pre výrobu, údržbu, vývoj produktov, marketing aj interné technické riešenia.",
          "Firmy často potrebujú rýchlo vyrobiť prototyp, prípravok, držiak, kryt, adaptér alebo menšiu sériu plastových dielov bez investície do foriem.",
        ],
      },
      {
        heading: "Malosériová výroba bez foriem",
        paragraphs: [
          "Pri menších sériách môže byť klasická výroba neefektívna. 3D tlač umožňuje vyrábať od jedného kusu až po malé série bez vysokých vstupných nákladov.",
          "Diely je možné priebežne upravovať, optimalizovať a vyrábať podľa aktuálnej potreby firmy.",
        ],
      },
      {
        heading: "Technické diely a interné riešenia",
        paragraphs: [
          "3D tlač pre firmy je vhodná aj na výrobu pomocných prípravkov, montážnych pomôcok, ochranných krytov, úchytov alebo špeciálnych dielov do výroby.",
          "Výhodou je rýchlosť, flexibilita a možnosť prispôsobiť každý diel presne konkrétnemu použitiu.",
        ],
      },
    ],
  },

  {
    slug: "dizajnovy-objekt",
    title: "Dizajnový objekt",
    subtitle: "3D tlač dizajnových a dekoratívnych objektov na mieru",
    description:
      "Dizajnový 3D objekt vytvorený na mieru s dôrazom na tvar, detail, estetiku a výsledný vizuálny dojem.",
    image: "/realizacie/dizajnovy-objekt.jpg",
    category: "Dizajn",
    year: "2026",
    material: "PLA",
    size: "dekoratívny objekt",
    leadTime: "2 – 5 dní",
    seoKeywords: [
      "3D tlač dizajnových objektov",
      "dekorácia na mieru",
      "3D tlačený darček",
      "dizajnový objekt 3D tlač",
      "originálny 3D výtlačok",
      "3D tlač dekorácií",
    ],
    content: [
      {
        heading: "Dizajnové objekty z 3D tlače",
        paragraphs: [
          "3D tlač umožňuje vytvárať dizajnové objekty, dekorácie a originálne tvary, ktoré by bolo náročné alebo drahé vyrobiť klasickými technológiami.",
          "Takýto objekt môže slúžiť ako dekorácia, darček, prezentačný prvok, umelecký doplnok alebo personalizovaný výrobok.",
        ],
      },
      {
        heading: "Tvar, detail a vizuálny dojem",
        paragraphs: [
          "Pri dizajnových realizáciách je dôležitý nielen samotný tvar, ale aj proporcie, povrch, farba a celkové prevedenie.",
          "3D tlač umožňuje rýchlo testovať rôzne varianty dizajnu a pripraviť finálny objekt podľa predstavy zákazníka.",
        ],
      },
      {
        heading: "Personalizovaná výroba",
        paragraphs: [
          "Dizajnový objekt môže byť upravený podľa konkrétneho zadania — napríklad tvarom, rozmerom, farbou alebo textom.",
          "Vďaka tomu je 3D tlač vhodná aj na originálne darčeky, prototypy dizajnových produktov alebo firemné prezentačné predmety.",
        ],
      },
    ],
  },
];

export function getRealization(slug: string) {
  return realizacie.find((item) => item.slug === slug);
}