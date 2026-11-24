/**
 * Tlačko — znalostná báza offline chat asistenta.
 *
 * Všetko je statický text: žiadne volanie API, AI ani externej služby.
 * Odpoveď sa vyberá podľa kľúčových slov (bez diakritiky, malými písmenami)
 * alebo podľa tlačidla. Ceny a údaje zodpovedajú kódu webu k 24. 11. 2026:
 * lib/pricing.ts (materiály, minimálna cena, množstevné zľavy),
 * lib/shipping.ts (doprava), lib/print-options.ts (farby, kvality),
 * lib/multicolor.ts (viacfarebná tlač). Pri zmene cien ich uprav aj tu.
 */

export const LINKS = {
  kalkulator: "/#kalkulator",
  cennik: "/#cennik",
  realizacie: "/realizacie",
  faq: "/faq",
  kontakt: "/kontakt",
  blog: "/blog",
  podmienky: "/podmienky",
  modely: "/produkty",
  objednavky: "/ucet/objednavky",
  blogCena: "/blog/kolko-stoji-3d-tlac",
  blogMaterialy: "/blog/materialy-na-3d-tlac-pla-petg-abs-tpu",
  blogStl: "/blog/priprava-stl-suboru-na-3d-tlac",
} as const;

export const CONTACT = {
  email: "info@vytlacto3d.sk",
  phone: "+421 917 244 422",
};

export type TlackoAction =
  | { kind: "link"; label: string; href: string }
  | { kind: "intent"; label: string; intent: string };

export type TlackoIntent = {
  id: string;
  /** Kľúčové slová / frázy bez diakritiky; dlhšia zhoda váži viac. */
  keywords: string[];
  answer: string;
  actions?: TlackoAction[];
};

const toCalc: TlackoAction = { kind: "link", label: "Prejsť na kalkulátor", href: LINKS.kalkulator };
const toContact: TlackoAction = { kind: "link", label: "Napíšte nám", href: LINKS.kontakt };

export const WELCOME: TlackoIntent = {
  id: "uvod",
  keywords: [],
  answer:
    "Ahoj, som Tlačko 👋 Pomôžem vám s 3D tlačou na vytlacto3d.sk — s cenou, súbormi, materiálmi aj doručením. Vyberte tému alebo napíšte otázku.",
  actions: [
    { kind: "intent", label: "Koľko to stojí?", intent: "cena" },
    { kind: "intent", label: "Nemám 3D model", intent: "bez-modelu" },
    { kind: "intent", label: "Aký materiál?", intent: "sprievodca" },
    { kind: "intent", label: "Doprava a platba", intent: "doprava" },
  ],
};

export const FALLBACK: TlackoIntent = {
  id: "nerozumiem",
  keywords: [],
  answer: `Tomu som celkom nerozumel 🙈 Skúste to napísať inak, vyberte tému nižšie, alebo nám napíšte — odpovieme osobne na ${CONTACT.email} alebo na čísle ${CONTACT.phone}.`,
  actions: [
    { kind: "intent", label: "Koľko to stojí?", intent: "cena" },
    { kind: "intent", label: "Aký materiál?", intent: "sprievodca" },
    toContact,
  ],
};

export const INTENTS: TlackoIntent[] = [
  {
    id: "cena",
    keywords: ["kolko", "stoji", "cena", "ceny", "cennik", "naceni", "nacenenie", "kalkul", "drahe", "lacne", "price", "eur", "€", "zlava", "zlavy"],
    answer:
      "Cenu vypočíta kalkulátor hneď po nahratí modelu — podľa hmotnosti materiálu, času tlače, kvality a počtu kusov. Minimálna cena položky je 10 € bez DPH (12,30 € s DPH). Pri väčšom počte kusov dostanete zľavu: od 20 ks 5 %, od 50 ks 10 %, od 100 ks 15 %. Ak vám nezáleží na presnom materiáli alebo farbe, ušetríte ďalšie 1 € za každú voľbu.",
    actions: [toCalc, { kind: "link", label: "Cenník materiálov", href: LINKS.cennik }, { kind: "link", label: "Koľko stojí 3D tlač (článok)", href: LINKS.blogCena }],
  },
  {
    id: "subory",
    keywords: ["subor", "format", "stl", "obj", "3mf", "step", "stp", "nahrat", "nahrajem", "upload", "aky subor"],
    answer:
      "Do kalkulátora nahráte 3D model vo formáte STL, OBJ alebo 3MF. Prijímame aj obrázky SVG, PNG, JPG a WEBP — z nich vytvoríme 3D model (napr. logo alebo nápis). Formát STEP zatiaľ nepodporujeme, vyexportujte ho prosím do STL.",
    actions: [toCalc, { kind: "link", label: "Ako pripraviť STL", href: LINKS.blogStl }],
  },
  {
    id: "logo",
    keywords: ["logo", "obrazok", "obrazka", "svg", "png", "jpg", "jpeg", "napis", "fotka", "nalepka", "znak", "erb", "mam len logo"],
    answer:
      "Stačí logo alebo obrázok 👍 Postup: 1) v kalkulátore nahrajte SVG, PNG alebo JPG (najlepšie SVG alebo obrázok s jasným kontrastom), 2) web z neho vytvorí 3D model, 3) nastavte výšku a veľkosť, materiál a farbu, 4) cenu uvidíte hneď a môžete objednať.",
    actions: [toCalc],
  },
  {
    id: "bez-modelu",
    keywords: ["nemam model", "nemam 3d", "bez modelu", "nemam subor", "navrh", "navrhnut", "modelovanie", "vymodelovat", "nakreslit", "vykres", "zadarmo", "modely zadarmo", "stiahnut model"],
    answer:
      "Nevadí. Máte tri možnosti: 1) vyberte si hotový model z našej ponuky, 2) ak máte logo alebo obrázok, nahrajte ho a 3D model vytvoríme z neho, 3) pošlite nám fotku, nákres alebo výkres cez formulár „Napíšte nám“ a pripravíme vám ponuku na vymodelovanie.",
    actions: [{ kind: "link", label: "Hotové modely", href: LINKS.modely }, { kind: "intent", label: "Mám len logo", intent: "logo" }, toContact],
  },
  {
    id: "materialy",
    keywords: ["material", "materialy", "pla", "petg", "abs", "pa6", "nylon", "karbon", "carbon", "filament", "tpu", "pruzny", "gumeny"],
    answer:
      "Tlačíme z týchto materiálov (cena materiálu bez DPH):\n• PLA — 0,012 €/g: vizuálne prototypy, dekorácie, univerzálne diely.\n• PETG — 0,016 €/g: funkčné diely, vyššia odolnosť, aj do exteriéru.\n• ABS — 0,030 €/g: technické diely, teplotná odolnosť a pevnosť.\n• PA6-CF — 0,080 €/g: nylon s uhlíkovými vláknami, najpevnejšie a najtuhšie diely, odolá teplu (len čierna).\nPružné TPU momentálne v kalkulátore neponúkame.",
    actions: [{ kind: "intent", label: "Pomôž mi vybrať", intent: "sprievodca" }, { kind: "link", label: "Článok o materiáloch", href: LINKS.blogMaterialy }, toCalc],
  },
  {
    id: "sprievodca",
    keywords: ["aky material", "ktory material", "vybrat material", "poradit", "odporuc", "do auta", "auto", "aute", "exterier", "vonku", "teplo", "teplot", "slnko", "pevny", "pevnost", "odolny", "vonkajsi"],
    answer: "Rád poradím s materiálom. Na čo bude výrobok slúžiť?",
    actions: [
      { kind: "intent", label: "Dekorácia, interiér", intent: "mat-interier" },
      { kind: "intent", label: "Exteriér, voda, slnko", intent: "mat-exterier" },
      { kind: "intent", label: "Do auta, teplo", intent: "mat-auto" },
      { kind: "intent", label: "Maximálna pevnosť", intent: "mat-pevnost" },
    ],
  },
  {
    id: "mat-interier",
    keywords: [],
    answer: "Na dekorácie, makety a bežné diely do interiéru odporúčam PLA — je najlacnejšie, presné a má najviac farieb. Ak má diel niečo vydržať (napr. držiak), zvoľte PETG.",
    actions: [toCalc, { kind: "intent", label: "Iné použitie", intent: "sprievodca" }],
  },
  {
    id: "mat-exterier",
    keywords: [],
    answer: "Do exteriéru odporúčam PETG — znesie vlhkosť aj slnko a je odolnejšie ako PLA. Pri vysokých teplotách (napr. tmavý diel na priamom slnku) zvážte ABS.",
    actions: [toCalc, { kind: "intent", label: "Iné použitie", intent: "sprievodca" }],
  },
  {
    id: "mat-auto",
    keywords: [],
    answer: "Do auta (palubná doska, interiér v lete) odporúčam ABS — vydrží vyššie teploty ako PLA či PETG. Na technické diely, ktoré musia byť veľmi pevné a tuhé aj v teple, zvoľte PA6-CF (len čierna).",
    actions: [toCalc, { kind: "intent", label: "Iné použitie", intent: "sprievodca" }],
  },
  {
    id: "mat-pevnost",
    keywords: [],
    answer: "Najpevnejší a najtuhší je PA6-CF — nylon s uhlíkovými vláknami, vhodný na technické a namáhané diely (len čierna). Lacnejšia pevná voľba je ABS alebo PETG s vyššou výplňou (infill).",
    actions: [toCalc, { kind: "intent", label: "Iné použitie", intent: "sprievodca" }],
  },
  {
    id: "farby",
    keywords: ["farba", "farby", "farbu", "farieb", "cierna", "biela", "cervena", "modra", "zelena", "siva", "fialova", "oranzova", "viacfarebn", "farebn"],
    answer:
      "Farby: čierna, biela, sivá, červená, modrá, zelená, fialová a oranžová (PLA, PETG, ABS). PA6-CF tlačíme len v čiernej. Viacfarebný model (aspoň dve farby) stojí navyše 10 € bez DPH za položku. Ak vám na farbe nezáleží, zaškrtnite to a ušetríte 1 €.",
    actions: [toCalc],
  },
  {
    id: "kvalita",
    keywords: ["kvalita", "kvalitu", "rozlisenie", "vrstva", "vrstvy", "detail", "detailna", "rychla", "standard", "infill", "vypln", "hladk"],
    answer:
      "Kvalita tlače: Rýchla (vrstva 0,28 mm) — najlacnejšia, Štandard (0,20 mm) — na väčšinu dielov, Detailná (0,12 mm) — jemné detaily a hladší povrch. Výplň (infill) určuje pevnosť vnútra: viac % = pevnejší, ale ťažší a drahší diel.",
    actions: [toCalc],
  },
  {
    id: "doprava",
    keywords: ["doprava", "dopravu", "dorucenie", "dorucit", "dorucite", "posta", "packeta", "zasielkovna", "z-box", "zbox", "kurier", "postovne", "odber", "osobny odber", "vyzdvihnut"],
    answer:
      "Doprava (ceny s DPH):\n• Packeta — výdajné miesto alebo Z-Box: 4,92 €\n• Kuriér na adresu: 6,15 €\nZásielku posielame po dokončení tlače.",
    actions: [{ kind: "intent", label: "Ako môžem zaplatiť?", intent: "platba" }, { kind: "intent", label: "Ako dlho to trvá?", intent: "termin" }],
  },
  {
    id: "platba",
    keywords: ["platba", "platit", "zaplatit", "zaplatim", "karta", "kartou", "prevod", "prevodom", "stripe", "apple pay", "google pay", "dobierka", "faktura", "fakturu"],
    answer:
      "Zaplatiť môžete platobnou kartou cez zabezpečenú bránu Stripe alebo bankovým prevodom (pri prevode spúšťame výrobu po pripísaní platby). Na dobierku zatiaľ neposielame. Faktúru dostanete k objednávke; firmy vyplnia IČO, DIČ a IČ DPH pri objednávke.",
    actions: [toCalc, { kind: "intent", label: "Doprava", intent: "doprava" }],
  },
  {
    id: "termin",
    keywords: ["ako dlho", "kedy", "termin", "rychlo", "dodacia", "lehota", "trva", "urgent", "expres", "zajtra", "do kedy"],
    answer:
      "Termín závisí od veľkosti modelu a počtu kusov. Stav objednávky vidíte v účte a o zmenách stavu vám príde e-mail. Ak to súri, napíšte nám pred objednaním a povieme vám presný termín.",
    actions: [{ kind: "link", label: "Moje objednávky", href: LINKS.objednavky }, toContact],
  },
  {
    id: "objednavka",
    keywords: ["stav objednavky", "moja objednavka", "kde je", "sledovat", "sledovanie", "zasielka", "objednavku", "objednal"],
    answer: "Stav objednávky nájdete po prihlásení v časti Môj účet → Objednávky. O zmenách stavu vám príde e-mail. Ak niečo nesedí, napíšte nám s číslom objednávky (VYT3D-…).",
    actions: [{ kind: "link", label: "Moje objednávky", href: LINKS.objednavky }, toContact],
  },
  {
    id: "reklamacia",
    keywords: ["reklamacia", "reklamovat", "pokazen", "zlomen", "vada", "chyba", "nefunguje", "vratenie", "vratit", "odstupit", "podmienky"],
    answer: "Mrzí nás to. Zjavné vady prosím nahláste najneskôr do 5 pracovných dní od prevzatia — napíšte nám s číslom objednávky a fotkou. Podrobnosti sú v obchodných podmienkach.",
    actions: [toContact, { kind: "link", label: "Obchodné podmienky", href: LINKS.podmienky }],
  },
  {
    id: "kontakt",
    keywords: ["kontakt", "telefon", "cislo", "email", "mail", "napisat", "zavolat", "clovek", "operator", "spojit", "firma", "adresa"],
    answer: `Radi vám odpovieme osobne: e-mail ${CONTACT.email}, telefón ${CONTACT.phone}, alebo cez formulár „Napíšte nám“ (môžete priložiť aj súbor).`,
    actions: [toContact],
  },
  {
    id: "realizacie",
    keywords: ["realizacie", "ukazky", "ukazka", "referencie", "co ste tlacili", "priklady", "portfolio", "galeria"],
    answer: "Pozrite si, čo sme už vytlačili — technické diely, prototypy aj darčeky.",
    actions: [{ kind: "link", label: "Realizácie", href: LINKS.realizacie }, { kind: "link", label: "Blog", href: LINKS.blog }],
  },
  {
    id: "faq",
    keywords: ["faq", "otazky", "casto", "pomoc", "navod", "ako to funguje", "ako objednat", "postup"],
    answer: "Ako to funguje: 1) nahrajte model do kalkulátora, 2) vyberte materiál, kvalitu, farbu a počet kusov, 3) cenu uvidíte hneď, 4) objednáte a zaplatíte, 5) vytlačíme a pošleme. Odpovede na ďalšie otázky sú v časti FAQ.",
    actions: [toCalc, { kind: "link", label: "Časté otázky", href: LINKS.faq }],
  },
  {
    id: "pozdrav",
    keywords: ["ahoj", "dobry den", "cau", "zdravim", "hello", "hi", "cus"],
    answer: "Ahoj! S čím vám môžem pomôcť?",
    actions: WELCOME.actions,
  },
  {
    id: "dakujem",
    keywords: ["dakujem", "dik", "diky", "vdaka", "super", "ok dakujem"],
    answer: "Rado sa stalo 🙂 Ak budete niečo potrebovať, som tu.",
    actions: [toCalc],
  },
];

const ALL = [...INTENTS, WELCOME, FALLBACK];

export function getIntent(id: string): TlackoIntent {
  return ALL.find((i) => i.id === id) ?? FALLBACK;
}

/** Text bez diakritiky, malými písmenami, bez interpunkcie (okrem €). */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9€\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Najlepší intent podľa kľúčových slov; frázy a dlhšie slová vážia viac. */
export function findIntent(question: string): TlackoIntent {
  const q = ` ${normalize(question)} `;
  if (!q.trim()) return FALLBACK;
  const words = q.trim().split(" ");
  let best: TlackoIntent = FALLBACK;
  let bestScore = 0;
  for (const intent of INTENTS) {
    let score = 0;
    for (const kw of intent.keywords) {
      if (kw.includes(" ")) {
        if (q.includes(` ${kw} `) || q.includes(` ${kw}`)) score += 3 + kw.length / 4;
      } else if (words.some((w) => w === kw || (kw.length >= 4 && w.startsWith(kw)))) {
        score += 1 + kw.length / 10;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = intent;
    }
  }
  return best;
}
