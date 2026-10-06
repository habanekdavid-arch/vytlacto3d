/**
 * Blogové články z repozitára. Web si pri štarte každý nový článok sám vloží
 * do databázy (lib/blog-sync.ts), takže sa objaví na /blog aj v CMS. Vloží ho
 * iba raz — neskoršie úpravy alebo zmazanie v CMS sa už neprepíšu.
 */

export type RepoBlogPost = {
  /** Pevné ID, aby sa dal článok v CMS otvoriť priamym odkazom. */
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  publishedAt: string;
  readingTime: string;
  featured?: boolean;
  sections: { heading: string; paragraphs?: string[]; bullets?: string[] }[];
  cta?: string;
};

export const repoBlogPosts: RepoBlogPost[] = [
  {
    id: "blog-cena-3d-tlace-manipulacny-poplatok",
    slug: "co-ovplyvnuje-cenu-3d-tlace-manipulacny-poplatok",
    title: "Čo všetko ovplyvňuje cenu 3D tlače — a prečo vám ukazujeme manipulačný poplatok",
    subtitle: "Materiál, čas tlače, kvalita, výplň, podpery, počet kusov aj poplatok za spracovanie objednávky. Otvorene a bez skrytých položiek.",
    description:
      "Z čoho sa skladá cena 3D tlače na VytlačTo3D: materiál a hmotnosť, čas tlače, kvalita, výplň, podpery, mierka, počet kusov, DPH, doprava a manipulačný poplatok 12,30 € za spracovanie objednávky a prípravu dát.",
    // Dočasný obrázok — skutočný sa nahrá v CMS (odkaz v návode k článku).
    image: "/blog/kolko-stoji-3d-tlac.jpg",
    publishedAt: "2026-10-06",
    readingTime: "6 min",
    featured: true,
    sections: [
      {
        heading: "Cena 3D tlače nie je číslo z hlavy",
        paragraphs: [
          "Keď nahráte model do našej kalkulačky, cenu nevymýšľame odhadom. Systém model zmeria — objem, povrch, výšku aj previsy, ktoré budú potrebovať podpery — a podľa toho vypočíta, koľko materiálu sa spotrebuje a ako dlho bude tlačiareň pracovať.",
          "Výpočet sme nedávno spresnili: nastavili sme ho podľa skutočného slicera s profilmi tlačiarní, na ktorých tlačíme. Hmotnosť modelu sa od reality líši zvyčajne len o pár percent. V tomto článku otvorene rozoberieme, čo všetko výslednú cenu ovplyvňuje.",
        ],
      },
      {
        heading: "Manipulačný poplatok: 10 € + DPH = 12,30 €",
        paragraphs: [
          "Súčasťou ceny je manipulačný poplatok za spracovanie objednávky a prípravu dát. Pokrýva prácu, ktorá je pri každom modeli rovnaká bez ohľadu na to, či je malý alebo veľký:",
        ],
        bullets: [
          "kontrola modelu — rozmery, uzavretosť siete, príliš tenké steny a ďalšie chyby, ktoré by tlač pokazili,",
          "príprava dát na tlač — natočenie modelu, nastavenie vrstiev, výplne a podpier (slicing),",
          "príprava tlačiarne — čistá podložka, správny filament a farba, kontrola prvej vrstvy,",
          "dokončenie — odstránenie podpier, kontrola kvality výtlačku,",
          "zabalenie, odovzdanie dopravcovi a administratíva objednávky vrátane faktúry.",
        ],
      },
      {
        heading: "Koľkokrát sa poplatok platí",
        paragraphs: [
          "Manipulačný poplatok sa účtuje raz za každý model (súbor) v objednávke — nie za každý kus. Ak si objednáte 10 kusov toho istého modelu, zaplatíte ho len raz, a preto cena za kus pri väčšom množstve výrazne klesá. Ak pošlete dva rôzne modely, každý sa pripravuje zvlášť, takže sa poplatok započíta pri každom z nich.",
        ],
      },
      {
        heading: "Prečo ho neschovávame do ceny",
        paragraphs: [
          "Tento poplatok nechceme schovávať priamo v cene samotného materiálu a výtlačku, ako to zvyknú robiť iné weby. Chýbajúca transparentnosť na našej strane priamo pri kalkulácii však bola chyba, za ktorú sa ospravedlňujeme.",
          "Preto o ňom píšeme otvorene: v každej cene z našej kalkulačky je manipulačný poplatok 12,30 € už započítaný a zvyšok tvorí samotná výroba. Žiadne ďalšie skryté položky — k cene sa pripočíta už len doprava.",
        ],
      },
      {
        heading: "Materiál a hmotnosť",
        paragraphs: [
          "Platíte len za materiál, ktorý sa naozaj spotrebuje. Ten tvoria plné steny a vrchné a spodné vrstvy, výplň vnútra a prípadné podpery. Cena za gram s DPH je približne:",
        ],
        bullets: [
          "PLA — 1,5 centa za gram (najčastejšia voľba na bežné diely a dekorácie),",
          "PETG — 2 centy za gram (odolnejší, vhodný aj do exteriéru),",
          "ABS — 3,7 centa za gram (tepelne odolnejší, technické diely).",
        ],
      },
      {
        heading: "Čas tlače — najväčšia časť ceny za výrobu",
        paragraphs: [
          "Väčšinu ceny za výrobu netvorí materiál, ale čas, počas ktorého tlačiareň pracuje. Ten závisí od veľkosti modelu, jeho výšky (počtu vrstiev), množstva stien a výplne a od zvolenej kvality. Do času sa započítavajú aj podpery, ktoré sa tlačia pomalšie. PETG sa tlačí pomalšie ako PLA, preto je výroba z neho o niečo drahšia.",
        ],
      },
      {
        heading: "Kvalita tlače",
        bullets: [
          "Rýchla — vrstva 0,28 mm, najkratší čas a najnižšia cena, viditeľnejšie vrstvy,",
          "Štandard — vrstva 0,20 mm, najlepší pomer kvality a ceny pre väčšinu dielov,",
          "Detailná — vrstva 0,12 mm, najkrajší povrch, ale tlač trvá dlhšie.",
        ],
      },
      {
        heading: "Výplň, tvar modelu a podpery",
        paragraphs: [
          "Výplň (5 – 50 %) určuje, aký plný je model vnútri. Vyššia výplň znamená pevnejší diel, ale aj viac materiálu a času. Steny a povrch sú plné vždy, takže na bežné použitie spravidla stačí 15 – 20 %.",
          "Previsy, ktoré sa vo vzduchu nedajú vytlačiť, potrebujú podpery. Tie spotrebujú materiál aj čas a po tlači sa odstraňujú. Ak model vie stáť na rovnej ploche bez veľkých previsov, tlač je lacnejšia.",
        ],
      },
      {
        heading: "Mierka modelu",
        paragraphs: [
          "Pri zmene mierky rastie objem rýchlejšie, ako by sa zdalo: model zväčšený na dvojnásobok má osemnásobný objem. Cena preto pri zväčšovaní rastie výraznejšie a pri zmenšovaní zase rýchlo klesá.",
        ],
      },
      {
        heading: "Počet kusov a zľavy",
        bullets: [
          "manipulačný poplatok sa pri viacerých kusoch toho istého modelu platí len raz,",
          "od 20 kusov množstevná zľava 5 %, od 50 kusov 10 %, od 100 kusov 15 % z ceny výroby,",
          "zaškrtnutím „Nezáleží mi na materiáli“ alebo „Nezáleží mi na farbe“ získate zľavu 1 € + DPH za každú voľbu, keďže môžeme tlačiť z toho, čo máme práve pripravené.",
        ],
      },
      {
        heading: "DPH a doprava",
        paragraphs: [
          "Všetky ceny v kalkulačke vidíte aj s DPH 23 %. Doprava sa pripočíta raz za objednávku: Packeta (výdajné miesto alebo Z-Box) 4,92 €, kuriér na adresu 6,15 €.",
        ],
      },
      {
        heading: "Príklad výpočtu",
        paragraphs: [
          "Držiak s rozmermi 6 × 4 × 4 cm z PLA, kvalita Štandard, výplň 20 % (asi 13 g):",
        ],
        bullets: [
          "manipulačný poplatok: 12,30 €,",
          "výroba (materiál a čas tlače): 1,92 €,",
          "spolu za 1 kus: 14,22 € s DPH,",
          "10 kusov: 31,50 € s DPH — teda 3,15 € za kus, lebo poplatok sa platí len raz.",
        ],
      },
      {
        heading: "Ako na 3D tlači ušetriť",
        bullets: [
          "objednajte viac kusov naraz — poplatok sa rozpočíta,",
          "pri bežných dieloch voľte kvalitu Štandard a výplň 15 – 20 %,",
          "natočte model tak, aby potreboval čo najmenej podpier,",
          "ak vám nezáleží na farbe alebo materiáli, zaškrtnite to a získate zľavu,",
          "spojte viac modelov do jednej objednávky — dopravu platíte len raz.",
        ],
      },
    ],
    cta: "Nahrajte svoj model do kalkulačky — presnú cenu vrátane manipulačného poplatku uvidíte hneď.",
  },
];
