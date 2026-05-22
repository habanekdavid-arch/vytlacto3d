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
    subtitle: "Funkčný prototyp na overenie tvaru a použitia",
    description:
      "3D tlačený technický diel určený na rýchle testovanie rozmerov, uchytenia a funkčnosti pred finálnou výrobou.",
    image: "/realizacie/technicky-prototyp.jpg",
    category: "Prototypovanie",
    year: "2026",
    material: "PLA / PETG",
    size: "podľa zadania",
    leadTime: "2 – 4 dni",
    featured: true,
    content: [
      {
        heading: "Zadanie projektu",
        paragraphs: [
          "Cieľom bolo vytvoriť funkčný technický prototyp, ktorý umožní rýchlo overiť tvar, rozmery a praktické použitie dielu ešte pred finálnou výrobou.",
          "Takýto typ realizácie je ideálny pre firmy, vývojárov produktov aj domácich majstrov, ktorí potrebujú dostať návrh z obrazovky do reálneho sveta.",
        ],
      },
      {
        heading: "Riešenie",
        paragraphs: [
          "Model bol pripravený na 3D tlač s dôrazom na pevnosť, presnosť a krátky výrobný čas.",
          "Výhodou 3D tlače je, že prototyp je možné rýchlo upraviť a vytlačiť ďalšiu verziu bez potreby drahých foriem alebo nástrojov.",
        ],
      },
    ],
  },
  {
    slug: "drziak-na-mieru",
    title: "Držiak na mieru",
    subtitle: "Praktický diel prispôsobený konkrétnemu použitiu",
    description:
      "Držiak vytvorený podľa konkrétnych požiadaviek zákazníka s dôrazom na funkčnosť a jednoduchú montáž.",
    image: "/realizacie/drziak-na-mieru.jpg",
    category: "Diel na mieru",
    year: "2026",
    material: "PETG",
    size: "kompaktný diel",
    leadTime: "1 – 3 dni",
    content: [
      {
        heading: "Zadanie projektu",
        paragraphs: [
          "Zákazník potreboval jednoduchý, pevný a praktický držiak, ktorý by presne zapadol do jeho použitia.",
          "Bežné dostupné riešenia nevyhovovali rozmermi ani spôsobom uchytenia.",
        ],
      },
      {
        heading: "Výsledok",
        paragraphs: [
          "Výsledkom je diel na mieru, ktorý spĺňa presné požiadavky použitia a dá sa jednoducho opakovane vyrobiť.",
          "Pri podobných projektoch je 3D tlač výhodná najmä tým, že umožňuje výrobu už od jedného kusu.",
        ],
      },
    ],
  },
  {
    slug: "produktovy-model",
    title: "Produktový model",
    subtitle: "Vizuálny model pre prezentáciu a testovanie dizajnu",
    description:
      "Model produktu vhodný na prezentáciu, overenie proporcií alebo prípravu pred ďalšou výrobou.",
    image: "/realizacie/produktovy-model.jpg",
    category: "Produktový dizajn",
    year: "2026",
    material: "PLA",
    size: "prezentačný model",
    leadTime: "2 – 5 dní",
    content: [
      {
        heading: "Účel realizácie",
        paragraphs: [
          "Produktový model slúži na overenie dizajnu, proporcií a celkového dojmu ešte pred výrobou finálneho produktu.",
          "To, čo vyzerá dobre v 3D programe, nemusí vždy rovnako fungovať aj fyzicky v ruke.",
        ],
      },
      {
        heading: "Prínos 3D tlače",
        paragraphs: [
          "3D tlač umožnila rýchlo pripraviť fyzický model, ktorý je možné ukázať klientovi, tímu alebo použiť pri prezentácii.",
        ],
      },
    ],
  },
  {
    slug: "nahradny-diel",
    title: "Náhradný diel",
    subtitle: "Výroba dielu, ktorý už nemusí byť dostupný",
    description:
      "Náhradný plastový diel vyrobený podľa pôvodného dielu alebo technického zadania.",
    image: "/realizacie/nahradny-diel.jpg",
    category: "Náhradné diely",
    year: "2026",
    material: "PETG / ABS",
    size: "podľa dielu",
    leadTime: "2 – 4 dni",
    featured: true,
    content: [
      {
        heading: "Problém",
        paragraphs: [
          "Pri starších produktoch sa často stáva, že konkrétny náhradný diel už nie je dostupný alebo jeho dodanie trvá príliš dlho.",
          "3D tlač umožňuje takýto diel znovu vyrobiť podľa rozmerov, fotiek alebo pôvodného kusu.",
        ],
      },
      {
        heading: "Riešenie",
        paragraphs: [
          "Diel bol pripravený s dôrazom na funkčnosť, pevnosť a praktické použitie.",
          "Pri technických dieloch vieme odporučiť aj vhodnejší materiál podľa záťaže a prostredia.",
        ],
      },
    ],
  },
  {
    slug: "firemna-zakazka",
    title: "Firemná zákazka",
    subtitle: "Malosériová výroba a technické riešenia pre firmy",
    description:
      "Výroba dielov pre firemné použitie, prototypovanie alebo interné technické riešenia.",
    image: "/realizacie/firemna-zakazka.jpg",
    category: "Firemná výroba",
    year: "2026",
    material: "PLA / PETG / ABS",
    size: "maloséria",
    leadTime: "individuálne",
    content: [
      {
        heading: "Firemné využitie",
        paragraphs: [
          "3D tlač je vhodná pre firmy, ktoré potrebujú rýchlo vyrábať prototypy, prípravky, držiaky, kryty alebo menšie série dielov.",
          "Oproti klasickej výrobe odpadajú vysoké vstupné náklady na formy alebo nástroje.",
        ],
      },
      {
        heading: "Výsledok",
        paragraphs: [
          "Zákazka bola pripravená s dôrazom na opakovateľnosť, kvalitu výstupu a praktické použitie vo výrobe.",
        ],
      },
    ],
  },
  {
    slug: "dizajnovy-objekt",
    title: "Dizajnový objekt",
    subtitle: "Estetický 3D výtlačok s dôrazom na detail",
    description:
      "Dizajnový objekt vytvorený s dôrazom na tvar, povrch a výsledný vizuálny dojem.",
    image: "/realizacie/dizajnovy-objekt.jpg",
    category: "Dizajn",
    year: "2026",
    material: "PLA",
    size: "dekoratívny objekt",
    leadTime: "2 – 5 dní",
    content: [
      {
        heading: "Dizajnový zámer",
        paragraphs: [
          "Pri dizajnových objektoch je dôležitý nielen samotný tvar, ale aj kvalita povrchu, proporcie a vizuálny dojem.",
          "3D tlač umožňuje vytvárať tvary, ktoré by boli inými technológiami zložité alebo drahé.",
        ],
      },
      {
        heading: "Výsledok",
        paragraphs: [
          "Výsledkom je originálny objekt vhodný ako dekorácia, prezentácia alebo personalizovaný výrobok.",
        ],
      },
    ],
  },
];

export function getRealization(slug: string) {
  return realizacie.find((item) => item.slug === slug);
}