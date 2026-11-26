/**
 * Tlačko — znalostná báza offline chat asistenta.
 *
 * Všetko je statický text: žiadne volanie API, AI ani externej služby.
 * Odpoveď sa vyberá podľa kľúčových slov (bez diakritiky, malými písmenami)
 * alebo podľa tlačidla. Ceny a údaje zodpovedajú kódu webu k 24. 11. 2026:
 * lib/pricing.ts (materiály, minimálna cena, množstevné zľavy),
 * lib/shipping.ts (doprava), lib/print-options.ts (farby, kvality),
 * lib/multicolor.ts (viacfarebná tlač), lib/company-info.ts + /kontakt
 * (kontakt), ContactForm (typy dopytu). Pri zmene cien ich uprav aj tu.
 * Pravidlo: Tlačko smie sľúbiť len to, čo web naozaj robí.
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
  hladatModel: "/kontakt?dopyt=hladat-model",
  blogCena: "/blog/kolko-stoji-3d-tlac",
  blogMaterialy: "/blog/materialy-na-3d-tlac-pla-petg-abs-tpu",
  blogStl: "/blog/priprava-stl-suboru-na-3d-tlac",
} as const;

export const CONTACT = {
  email: "info@vytlacto3d.sk",
  phone: "+421 907 907 097",
};

/**
 * Miesta na stránke, ktoré Tlačko vie zvýrazniť (spotlight). Každé má
 * kandidátov v poradí — použije sa prvý, ktorý je naozaj viditeľný, s popisom
 * presne k nemu (napr. po nahratí modelu je pole na nahratie skryté → ukáže
 * „+ Pridať“). Keď nie je viditeľný žiadny, Tlačko to povie v chate.
 */
export const TARGETS = {
  upload: {
    page: "/",
    candidates: [
      { selector: '[data-tlacko="dropzone"]', label: "Sem pretiahnite súbor alebo kliknite a vyberte ho 👆" },
      { selector: '[data-tlacko="add-model"]', label: "Ďalší model pridáte tu — kliknite na „+ Pridať“ 👆" },
    ],
  },
  cennik: { page: "/", candidates: [{ selector: "#cennik", label: "Tu je cenník materiálov 👇" }] },
  settings: {
    page: "/",
    candidates: [{ selector: '[data-tlacko="settings"]', label: "Tu nastavíte materiál, kvalitu, výplň, farbu a počet kusov 👇" }],
  },
} as const;
export type TargetId = keyof typeof TARGETS;

export type TlackoAction =
  | { kind: "link"; label: string; href: string }
  | { kind: "intent"; label: string; intent: string }
  /** Animovaná prehliadka konfigurátora. */
  | { kind: "tour"; label: string }
  /** Prejde na stránku a zvýrazní miesto (spotlight). */
  | { kind: "show"; label: string; target: TargetId }
  /** Zvýrazní nahrávanie a rovno otvorí výber súboru. */
  | { kind: "upload"; label: string };

export type TlackoIntent = {
  id: string;
  /** Kľúčové slová / frázy bez diakritiky; dlhšia zhoda váži viac. */
  keywords: string[];
  answer: string;
  actions?: TlackoAction[];
};

const toCalc: TlackoAction = { kind: "show", label: "Prejsť na kalkulátor", target: "upload" };
const tour: TlackoAction = { kind: "tour", label: "▶ Ukáž mi, ako to funguje" };
const toContact: TlackoAction = { kind: "link", label: "Napíšte nám", href: LINKS.kontakt };

export const WELCOME: TlackoIntent = {
  id: "uvod",
  keywords: [],
  answer:
    "Ahoj, som Tlačko 👋 Pomôžem vám s 3D tlačou — ukážem vám, ako funguje konfigurátor, poradím s cenou, materiálom aj doručením. Vyberte tému alebo napíšte otázku.",
  actions: [
    tour,
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

function AFTER_UPLOAD_TEXT() {
  return "Nastavenie modelu v konfigurátore (krok 3):\n• Materiál — podľa toho, kde bude výrobok: interiér PLA, exteriér PETG, teplo a auto ABS, maximálna pevnosť PA6-CF.\n• Kvalita — Štandard stačí na väčšinu dielov, Detailná na jemné detaily, Rýchla na lacné prototypy.\n• Výplň — 15–20 % na bežné diely, 30–50 % na namáhané.\n• Farba a počet kusov — od 20 ks máte zľavu.\nCena sa prepočíta hneď pri každej zmene.";
}

/** Po nahratí modelu — Tlačko sa sám ozve s radou k nastaveniu. */
export const AFTER_UPLOAD: TlackoIntent = {
  id: "po-nahrati",
  keywords: [],
  answer:
    "Model je nahratý 🎉 Teraz ho nastavte v kroku 3:\n• Materiál — podľa toho, kde bude výrobok (poradím nižšie).\n• Kvalita — Štandard stačí na väčšinu dielov, Detailná na jemné detaily.\n• Výplň — 15–20 % na bežné diely, 30–50 % na namáhané.\n• Farba a počet kusov — od 20 ks máte zľavu.\nCena sa prepočíta hneď pri každej zmene.",
  actions: [
    { kind: "show", label: "Ukáž nastavenia", target: "settings" },
    { kind: "intent", label: "Aký materiál vybrať?", intent: "sprievodca" },
    { kind: "intent", label: "Kvalita a výplň", intent: "kvalita" },
  ],
};

/** Keď zvýrazňované miesto na stránke ešte nie je (napr. nastavenia pred nahratím modelu). */
export const TARGET_MISSING: Record<TargetId, TlackoIntent> = {
  settings: {
    id: "chyba-nastavenia",
    keywords: [],
    answer: "Nastavenia (materiál, kvalita, výplň, farba, počet kusov) sa zobrazia až po nahratí modelu. Nahrajte ho a potom vám ich ukážem.",
    actions: [{ kind: "upload", label: "Nahrať model teraz" }, { kind: "tour", label: "▶ Ukáž mi, ako to funguje" }],
  },
  upload: {
    id: "chyba-nahratie",
    keywords: [],
    answer: "Miesto na nahratie modelu sa mi teraz nepodarilo nájsť. Nájdete ho na úvodnej stránke v časti Konfigurátor.",
    actions: [{ kind: "link", label: "Úvodná stránka", href: "/#kalkulator" }],
  },
  cennik: {
    id: "chyba-cennik",
    keywords: [],
    answer: "Cenník sa mi teraz nepodarilo nájsť. Nájdete ho na úvodnej stránke v časti Cenník.",
    actions: [{ kind: "link", label: "Úvodná stránka", href: "/#cennik" }],
  },
};

export const INTENTS: TlackoIntent[] = [
  {
    id: "nastavenia",
    keywords: ["nastavit", "nastavenie", "nastavenia", "parametre", "parameter", "ako nastavit", "co nastavit", "co zvolit", "co vybrat"],
    answer: AFTER_UPLOAD_TEXT(),
    actions: [
      { kind: "show", label: "Ukáž nastavenia", target: "settings" },
      { kind: "intent", label: "Aký materiál vybrať?", intent: "sprievodca" },
    ],
  },
  {
    id: "konfigurator",
    keywords: ["konfigurator", "ako funguje", "ako to funguje", "ukaz", "ukazte", "navod", "ako objednat", "postup", "ako na to", "kde nahram", "kde nahrat", "nahrat model", "ako zacat"],
    answer: "Ukážem vám to krok po kroku — v 5 krokoch od nahratia modelu po doručenie. Alebo vám rovno ukážem, kam model nahrať.",
    actions: [tour, { kind: "show", label: "Kam nahrám model?", target: "upload" }, { kind: "upload", label: "Nahrať model teraz" }],
  },
  {
    id: "cena",
    keywords: ["kolko", "stoji", "cena", "ceny", "cennik", "naceni", "nacenenie", "kalkul", "drahe", "lacne", "price", "eur", "€", "zlava", "zlavy"],
    answer:
      "Cenu vypočíta kalkulátor hneď po nahratí modelu — podľa hmotnosti materiálu, času tlače, kvality a počtu kusov. Minimálna cena jednej položky je 10 € bez DPH (12,30 € s DPH), počas akcie sa z nej odpočíta akciová zľava. Pri väčšom počte kusov dostanete zľavu: od 20 ks 5 %, od 50 ks 10 %, od 100 ks 15 %. Ak vám nezáleží na presnom materiáli alebo farbe, ušetríte 1 € za každú takú voľbu (nie však pod minimálnu cenu).",
    actions: [toCalc, { kind: "show", label: "Ukáž cenník", target: "cennik" }, { kind: "link", label: "Koľko stojí 3D tlač (článok)", href: LINKS.blogCena }],
  },
  {
    id: "subory",
    keywords: ["subor", "format", "stl", "obj", "3mf", "step", "stp", "nahrat", "nahrajem", "upload", "aky subor"],
    answer:
      "Do kalkulátora nahráte 3D model vo formáte STL, OBJ alebo 3MF. Prijímame aj obrázky SVG, PNG, JPG a WEBP — z nich vytvoríme 3D model (napr. logo alebo nápis). Formát STEP konfigurátor nevie otvoriť — vyexportujte ho do STL, alebo nám ho pošlite cez formulár „Napíšte nám“ a nacenníme ho.",
    actions: [toCalc, { kind: "link", label: "Ako pripraviť STL", href: LINKS.blogStl }],
  },
  {
    id: "logo",
    keywords: ["logo", "obrazok", "obrazka", "svg", "png", "jpg", "jpeg", "napis", "fotka", "nalepka", "znak", "erb", "mam len logo"],
    answer:
      "Stačí logo alebo obrázok 👍 Postup: 1) v kalkulátore nahrajte SVG, PNG alebo JPG (najlepšie SVG alebo obrázok s jasným kontrastom), 2) web z neho vytvorí 3D model, 3) nastavte výšku a veľkosť, materiál a farbu, 4) cenu uvidíte hneď a môžete objednať.",
    actions: [{ kind: "upload", label: "Nahrať logo teraz" }, tour],
  },
  {
    id: "bez-modelu",
    keywords: ["nemam model", "nemam 3d", "bez modelu", "nemam subor", "navrh", "navrhnut", "modelovanie", "vymodelovat", "nakreslit", "vykres", "zadarmo", "modely zadarmo", "stiahnut model"],
    answer:
      "Nevadí. Máte tieto možnosti: 1) vyberte si hotový model z našej ponuky produktov, 2) nájdite si model na internete (na stránkach s 3D modelmi zadarmo), stiahnite ho a nahrajte do konfigurátora, 3) ak máte logo alebo obrázok, nahrajte ho a 3D model sa vytvorí z neho, 4) ak si neviete rady, napíšte nám cez formulár „Napíšte nám“ a ozveme sa vám.",
    actions: [
      { kind: "link", label: "Hotové modely", href: LINKS.modely },
      { kind: "link", label: "Stiahol som model z internetu", href: LINKS.hladatModel },
      { kind: "intent", label: "Mám len logo", intent: "logo" },
      toContact,
    ],
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
    answer: "Na dekorácie, makety a bežné diely do interiéru odporúčam PLA — je najlacnejšie, presné a ako jediné sa dá tlačiť aj viacfarebne. Ak má diel niečo vydržať (napr. držiak), zvoľte PETG.",
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
      "Farby: čierna, biela, sivá, červená, modrá, zelená, fialová a oranžová (PLA, PETG, ABS). PA6-CF tlačíme len v čiernej. Viacfarebná tlač (aspoň dve farby na jednom modeli) je len z PLA a stojí navyše 10 € bez DPH za položku. Ak vám na farbe nezáleží, zaškrtnite to a ušetríte 1 €. Skutočná dostupnosť farby závisí od skladových zásob.",
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
    keywords: ["platba", "platit", "zaplatit", "zaplatim", "karta", "kartou", "prevod", "prevodom", "stripe", "apple pay", "google pay", "dobierka", "ico", "dic"],
    answer:
      "Zaplatiť môžete platobnou kartou cez zabezpečenú bránu Stripe alebo bankovým prevodom — pri prevode vám pošleme platobné údaje e-mailom a objednávku spracujeme po prijatí platby. Na dobierku zatiaľ neposielame. Firmy môžu pri objednávke vyplniť IČO, DIČ a IČ DPH.",
    actions: [toCalc, { kind: "intent", label: "Doprava", intent: "doprava" }],
  },
  {
    id: "termin",
    keywords: ["ako dlho", "kedy", "termin", "rychlo", "dodacia", "lehota", "trva", "urgent", "expres", "zajtra", "do kedy"],
    answer:
      "Termín závisí od veľkosti modelu a počtu kusov. O každej zmene stavu (prijatá platba, tlačí sa, odoslaná) vám príde e-mail. Ak to súri, napíšte nám pred objednaním a povieme vám presný termín.",
    actions: [{ kind: "link", label: "Moje objednávky", href: LINKS.objednavky }, toContact],
  },
  {
    id: "objednavka",
    keywords: ["stav objednavky", "moja objednavka", "moje objednavky", "kde je", "zasielka", "objednavku", "objednal"],
    answer: "Ak ste objednávali prihlásený, stav nájdete v časti Moje objednávky. O každej zmene stavu (prijatá platba, tlačí sa, odoslaná, doručená) vám príde e-mail. Ak niečo nesedí, napíšte nám s číslom objednávky (VYT3D-…).",
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
    answer: "Pozrite si ukážky toho, čo sme už vytlačili.",
    actions: [{ kind: "link", label: "Realizácie", href: LINKS.realizacie }, { kind: "link", label: "Blog", href: LINKS.blog }],
  },
  {
    id: "faq",
    keywords: ["faq", "otazky", "casto", "pomoc"],
    answer: "Ako to funguje: 1) nahrajte model do kalkulátora, 2) vyberte materiál, kvalitu, farbu a počet kusov, 3) cenu uvidíte hneď, 4) objednáte a zaplatíte, 5) vytlačíme a pošleme. Odpovede na ďalšie otázky sú v časti FAQ.",
    actions: [tour, { kind: "link", label: "Časté otázky", href: LINKS.faq }],
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

const ALL = [...INTENTS, WELCOME, FALLBACK, AFTER_UPLOAD];

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
