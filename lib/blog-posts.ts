export type BlogSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type BlogPost = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  publishedAt: string;
  readingTime: string;
  featured?: boolean;
  sections: BlogSection[];
  cta?: string;
};

export const blogPosts: BlogPost[] = [
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
    sections: [
      {
        heading: "3D tlač je dnes dostupnejšia ako kedykoľvek predtým",
        paragraphs: [
          "3D tlač sa za posledné roky stala jednou z najdostupnejších technológií výroby. To, čo bolo kedysi možné len vo veľkých fabrikách, dnes zvládne moderná 3D tlačiareň rýchlo, presne a za rozumnú cenu.",
          "Aj preto sa čoraz viac ľudí pýta: koľko stojí 3D tlač na mieru? Odpoveď nie je úplne jednoduchá, ale v tomto článku vám vysvetlíme, čo všetko cenu 3D tlače ovplyvňuje a ako si spraviť reálnu predstavu o rozpočte.",
        ],
      },
      {
        heading: "Prečo neexistuje jedna univerzálna cena",
        paragraphs: [
          "Na rozdiel od bežných produktov nemá 3D tlač fixnú cenu. Každý výrobok je unikát – a práve to je jej najväčšia výhoda.",
          "Cena 3D tlače sa vždy počíta individuálne podľa konkrétneho modelu, materiálu, veľkosti, času tlače a požadovaného výsledku. Jednoducho povedané: platíte len za to, čo si necháte vyrobiť.",
        ],
      },
      {
        heading: "5 hlavných faktorov, ktoré ovplyvňujú cenu 3D tlače",
        bullets: [
          "Veľkosť a objem modelu – viac materiálu znamená vyššiu cenu.",
          "Typ materiálu – PLA, PETG, ABS alebo TPU majú rozdielne vlastnosti aj cenu.",
          "Čas tlače – čím dlhšie sa model tlačí, tým viac rastie cena výroby.",
          "Zložitosť modelu – detaily, presnosť a podpery zvyšujú náročnosť výroby.",
          "Post-processing – brúsenie, lepenie, lakovanie alebo finálne úpravy zvyšujú hodnotu hotového produktu.",
        ],
      },
      {
        heading: "Reálne príklady cien 3D tlače",
        bullets: [
          "malý držiak alebo jednoduchý diel: 5 – 15 €",
          "väčší technický diel: 20 – 60 €",
          "dekorácia alebo darček: 15 – 50 €",
          "komplexný model alebo prototyp: 50 – 150 €+",
        ],
      },
      {
        heading: "Zhrnutie",
        paragraphs: [
          "3D tlač je flexibilná, rýchla a dostupná forma výroby. Cena 3D tlače závisí od konkrétneho projektu, ale možnosti sú takmer neobmedzené.",
          "Ak chcete zistiť presnú cenu 3D tlače pre váš model, najlepšie je nahrať model alebo poslať zadanie a nechať si pripraviť konkrétnu ponuku.",
        ],
      },
    ],
    cta: "Máte model, nápad alebo problém, ktorý treba vyriešiť? Nahrajte ho do konfigurátora a zistite cenu 3D tlače.",
  },
  {
    slug: "materialy-na-3d-tlac-pla-petg-abs-tpu",
    title: "Aký materiál vybrať na 3D tlač?",
    subtitle: "PLA, PETG, ABS a TPU – výhody, nevýhody a použitie",
    description:
      "Neviete, aký materiál zvoliť na 3D tlač? Porovnanie PLA, PETG, ABS a TPU – vlastnosti, použitie, odolnosť a vhodnosť pre rôzne 3D modely a náhradné diely.",
    image: "/blog/materialy-na-3d-tlac-pla-petg-abs-tpu.jpg",
    publishedAt: "2026-04-02",
    readingTime: "7 min",
    sections: [
      {
        heading: "Výber materiálu rozhoduje o výsledku",
        paragraphs: [
          "Pri 3D tlači nerozhoduje len tvar modelu, ale aj správny materiál. To, aký filament vyberiete, ovplyvní pevnosť, vzhľad, odolnosť voči teplu, pružnosť aj celkovú cenu 3D tlače.",
          "Najčastejšie používané materiály na FDM 3D tlač sú PLA, PETG, ABS a TPU. Každý z nich sa hodí na iný typ výrobku.",
        ],
      },
      {
        heading: "PLA – najlepšia voľba pre bežnú 3D tlač",
        bullets: [
          "výhody: jednoduchá tlač, pekný vzhľad, priaznivá cena",
          "nevýhody: nižšia odolnosť voči teplu a nárazu",
          "vhodné použitie: dekorácie, držiaky, prototypy, menšie funkčné diely",
        ],
      },
      {
        heading: "PETG – pevnejší a odolnejší materiál",
        bullets: [
          "výhody: vyššia pevnosť, odolnosť, dobrá životnosť",
          "nevýhody: o niečo náročnejšia tlač než PLA",
          "vhodné použitie: technické diely, držiaky, kryty, funkčné komponenty",
        ],
      },
      {
        heading: "ABS – technický materiál pre náročnejšie použitie",
        bullets: [
          "výhody: vyššia tepelná odolnosť, technické využitie",
          "nevýhody: náročnejšia tlač, citlivosť na deformácie pri tlači",
          "vhodné použitie: technické diely, súčiastky, robustnejšie komponenty",
        ],
      },
      {
        heading: "TPU – pružný filament",
        bullets: [
          "výhody: flexibilita, pružnosť, odolnosť proti opotrebeniu",
          "nevýhody: pomalšia a náročnejšia tlač",
          "vhodné použitie: pružné diely, krytky, ochranné prvky, tesnenia",
        ],
      },
      {
        heading: "Ktorý materiál je najlepší na 3D tlač?",
        paragraphs: [
          "Neexistuje jeden univerzálne najlepší materiál. Najlepší materiál na 3D tlač závisí od toho, čo potrebujete vyrobiť.",
          "Ak chcete pekný a cenovo dostupný výtlačok, voľte PLA. Ak potrebujete odolnejší funkčný diel, siahnite po PETG. Ak riešite technickú súčiastku s vyššími nárokmi, zaujímavý môže byť ABS. A ak musí byť model pružný, správna voľba je TPU.",
        ],
      },
    ],
    cta: "Neviete, ktorý materiál je pre váš model najlepší? Nahrajte model a vyberieme vhodný filament podľa použitia.",
  },
  {
    slug: "priprava-stl-suboru-na-3d-tlac",
    title: "Ako pripraviť STL súbor na 3D tlač",
    subtitle: "7 najčastejších chýb pri STL modeli a ako sa im vyhnúť",
    description:
      "Pripravujete STL súbor na 3D tlač? Zistite, ako pripraviť 3D model správne, aké chyby spôsobujú problémy pri tlači a ako získať kvalitný výsledok bez zbytočných komplikácií.",
    image: "/blog/priprava-stl-suboru-na-3d-tlac.jpg",
    publishedAt: "2026-04-03",
    readingTime: "8 min",
    sections: [
      {
        heading: "Prečo je kvalitný STL súbor taký dôležitý",
        paragraphs: [
          "Aj najlepšia 3D tlačiareň potrebuje dobrý vstup. Ak je STL súbor zle pripravený, môže dôjsť k chybám v tlači, nepresnostiam, zlej kvalite povrchu alebo dokonca k zlyhaniu celej objednávky.",
          "Preto sa oplatí vedieť, ako pripraviť STL model na 3D tlač správne ešte pred nahraním do konfigurátora.",
        ],
      },
      {
        heading: "Najčastejšie chyby v STL súbore",
        bullets: [
          "nesprávna mierka modelu",
          "neuzavretý model alebo poškodená mesh sieť",
          "príliš tenké steny",
          "zbytočne komplikovaná geometria",
          "zlá orientácia modelu",
          "zbytočne ťažký model",
          "export bez kontroly rozmerov a objemu",
        ],
      },
      {
        heading: "Ako pripraviť 3D model správne",
        bullets: [
          "pracovať v milimetroch",
          "skontrolovať rozmery modelu",
          "overiť uzavretú geometriu",
          "vyhnúť sa príliš tenkým stenám",
          "myslieť na orientáciu a použitie modelu",
          "pred exportom skontrolovať finálny STL súbor",
        ],
      },
      {
        heading: "Zhrnutie",
        paragraphs: [
          "Správne pripravený STL súbor znamená menej problémov, presnejší výpočet ceny a lepší finálny výsledok.",
          "Ak si nie ste istí, či je váš model pripravený správne, radi sa naň pozrieme a odporučíme najvhodnejšie riešenie.",
        ],
      },
    ],
    cta: "Máte STL súbor a neviete, či je pripravený správne? Nahrajte ho do konfigurátora a overte si rozmery, objem aj cenu výroby.",
  },
  {
    slug: "3d-tlac-pre-vyrobu-prototypy",
    title: "3D tlač pre výrobu: prečo riešiť prototypy cez 3D tlač",
    subtitle: "Rýchle prototypovanie, technické diely a výroba bez zbytočných nákladov",
    description:
      "3D tlač pre firmy a výrobu: prečo riešiť prototypy cez 3D tlač, kedy sa oplatí výroba plastových dielov na mieru a prečo je 3D tlač ideálna pre vývoj produktov a technické riešenia.",
    image: "/blog/3d-tlac-pre-vyrobu-prototypy.jpg",
    publishedAt: "2026-04-08",
    readingTime: "7 min",
    sections: [
      {
        heading: "Prečo firmy riešia prototypy cez 3D tlač",
        paragraphs: [
          "Ak firma vyvíja nový produkt alebo rieši technický problém vo výrobe, väčšinou narazí na rovnakú bariéru: potrebuje niečo otestovať, ale výroba je pomalá, drahá alebo nepružná.",
          "A práve tu vzniká priestor pre 3D tlač prototypov. Rýchle prototypovanie cez 3D tlač umožňuje otestovať riešenie bez zbytočných investícií do nástrojov, foriem alebo zdĺhavej externej výroby.",
        ],
      },
      {
        heading: "Prototyp nie je cieľ. Je to nástroj na rozhodnutie.",
        paragraphs: [
          "Najväčšia chyba, ktorú pri firmách vidíme, je v tom, že prototyp berú len ako medzikrok. V realite je to však jeden z najdôležitejších momentov celého vývoja produktu.",
          "Ak máte prototyp v ruke, viete ho fyzicky posúdiť, viete ho otestovať v reálnych podmienkach a viete odhaliť chyby skôr, než budú stáť tisíce eur. Bez prototypu len odhadujete. S prototypom sa rozhodujete podľa reality.",
        ],
        bullets: [
          "viete ho chytiť do ruky",
          "viete ho otestovať v reálnych podmienkach",
          "viete odhaliť chyby skôr, než budú drahé",
        ],
      },
      {
        heading: "Prečo 3D tlač a nie klasická výroba prototypov",
        paragraphs: [
          "Klasická výroba prototypov cez CNC, formy alebo externé dielne býva nastavená skôr na finálny produkt než na rýchly vývoj. To znamená vyššie vstupné náklady, dlhšie dodacie lehoty a menšiu flexibilitu pri zmenách.",
          "Pri 3D tlači fungujete úplne inak. Upravíte model, vytlačíte ho znova, otestujete, zmeníte a pokračujete ďalej. Bez nákladov na nástroje, bez zbytočných prestojov a s oveľa väčšou kontrolou nad vývojom.",
        ],
        bullets: [
          "nižšie vstupné náklady",
          "rýchlejšie iterácie",
          "žiadne formy a minimálne fixné náklady",
          "vhodné pre vývoj, nie len finálnu sériu",
        ],
      },
      {
        heading: "Keď prototyp prechádza do reality",
        paragraphs: [
          "Veľkou výhodou je, že 3D tlač pre výrobu dnes nie je len o vizuálnych modeloch. V mnohých prípadoch ide o funkčné technické diely, komponenty, prípravky, držiaky alebo interné výrobné pomôcky.",
          "To znamená, že to, čo dnes testujete ako prototyp, môžete zajtra reálne používať vo výrobe. 3D tlač technických dielov tak nie je len vývojový nástroj, ale často aj reálne nasaditeľné riešenie.",
        ],
      },
      {
        heading: "Výroba plastových dielov na mieru bez zbytočných investícií",
        paragraphs: [
          "Nie každý diel potrebuje formu. Pri menších sériách, interných technických riešeniach alebo špecifických komponentoch býva výroba plastových dielov na mieru cez 3D tlač efektívnejšia než klasické vstrekovanie alebo obrábanie.",
          "To platí najmä vtedy, keď potrebujete vyrobiť jeden kus, pár kusov alebo priebežne upravovať dizajn podľa testovania a reálnej prevádzky.",
        ],
        bullets: [
          "nulové náklady na formy",
          "výroba už od 1 kusu",
          "rýchla úprava dizajnu",
          "ideálne pre údržbu výroby a náhradné diely",
        ],
      },
      {
        heading: "3D tlač produktového dizajnu: keď rozhoduje aj vizuál",
        paragraphs: [
          "Pri vývoji produktu nestačí, že funguje. Musí aj dobre vyzerať, sedieť v priestore, byť ergonomický a prezentovateľný. 3D tlač produktového dizajnu umožňuje overiť proporcie, varianty a vzhľad ešte pred finálnou výrobou.",
          "Rozdiel medzi tým, čo dobre vyzerá na obrazovke, a tým, čo funguje v realite, býva zásadný. Preto je fyzický prototyp dôležitý nielen technicky, ale aj obchodne a dizajnovo.",
        ],
      },
      {
        heading: "Prečo spolupracovať práve s nami",
        paragraphs: [
          "Na trhu nie je problém nájsť niekoho, kto vám niečo vytlačí. Skutočný rozdiel je v tom, či vám to pomôže vyriešiť problém. My nerozmýšľame len nad tlačou, ale nad použitím dielu, jeho pevnosťou, slabými miestami a reálnym nasadením.",
          "Nie sme len hobby dielňa. Sme výrobná firma a pracujeme s reálnymi technológiami, materiálmi a projektmi. Vieme navrhnúť riešenie, optimalizovať diel a pomôcť vám s prepojením na ďalšie výrobné kroky.",
        ],
        bullets: [
          "rozumieme výrobe, nie len tlači",
          "pomáhame optimalizovať diely a náklady",
          "upozorníme na slabé miesta riešenia",
          "vieme nadviazať ďalšími technológiami",
        ],
      },
      {
        heading: "Kedy sa vám 3D tlač oplatí najviac",
        bullets: [
          "vyvíjate nový produkt",
          "potrebujete rýchlo otestovať riešenie",
          "chýba vám technický diel",
          "optimalizujete výrobný proces",
          "nechcete investovať do foriem",
        ],
      },
      {
        heading: "Zhrnutie",
        paragraphs: [
          "3D tlač pre firmy dáva zmysel všade tam, kde potrebujete rýchlosť, flexibilitu a funkčný výsledok. Pri prototypoch, technických dieloch, interných komponentoch aj vývoji produktov ide často o najefektívnejší spôsob, ako sa posunúť z návrhu do reality.",
          "Ak potrebujete prototyp, technický diel alebo výrobu plastových dielov na mieru, radi vám pomôžeme nájsť riešenie, ktoré nebude len vytlačené, ale aj použiteľné v praxi.",
        ],
      },
    ],
    cta: "Vyvíjate produkt, testujete diel alebo riešite problém vo výrobe? Pošlite nám zadanie a pripravíme vám prototyp alebo technické riešenie na mieru.",
  },
];

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}