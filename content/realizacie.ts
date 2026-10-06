/**
 * Realizácie doplnené z fotiek v priečinku nahraj-realizacie/ (pozri jeho README).
 *
 * Web si pri štarte každú novú položku sám vloží do databázy (lib/realizacie-sync.ts),
 * takže sa objaví na /realizacie aj v CMS. Vloží ju iba raz — neskoršie úpravy
 * alebo zmazanie v CMS sa už neprepíšu ani nevrátia späť.
 */

export type RepoRealizacia = {
  /** Pevné ID, aby sa dala realizácia v CMS otvoriť priamym odkazom. */
  id?: string;
  /** false = skrytá, kým k nej admin v CMS nenahrá fotku a nezverejní ju. */
  published?: boolean;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  /** Hlavný obrázok, napr. /realizacie/drziak-na-bicykel/1.jpg */
  image: string;
  /** Ďalšie fotky do galérie v detaile realizácie. */
  images?: string[];
  category: string;
  year: string;
  material: string;
  size: string;
  leadTime: string;
  /** Veľká dlaždica v prehľade. */
  featured?: boolean;
  seoKeywords: string[];
  content: { heading: string; paragraphs: string[] }[];
};

export const repoRealizacie: RepoRealizacia[] = [
  {
    slug: "biely-rebrovany-kvetinac",
    title: "Biely rebrovaný kvetináč",
    subtitle: "Dizajnový obal na izbovú rastlinu z 3D tlačiarne",
    description:
      "Minimalistický biely kvetináč s jemným zvislým rebrovaním, vytlačený na 3D tlačiarni. Elegantný doplnok do bytu, kancelárie či recepcie.",
    image: "/realizacie/biely-rebrovany-kvetinac/1.jpg",
    images: [
      "/realizacie/biely-rebrovany-kvetinac/2.jpg",
      "/realizacie/biely-rebrovany-kvetinac/3.jpg",
      "/realizacie/biely-rebrovany-kvetinac/4.jpg",
      "/realizacie/biely-rebrovany-kvetinac/5.jpg",
    ],
    category: "Dizajn",
    year: "2026",
    material: "PLA / PETG",
    size: "na mieru podľa rastliny",
    leadTime: "2 – 5 dní",
    featured: true,
    seoKeywords: [
      "3D tlačený kvetináč",
      "kvetináč na mieru",
      "dizajnový kvetináč",
      "rebrovaný kvetináč",
      "3D tlač dekorácií",
      "obal na kvetináč",
    ],
    content: [
      {
        heading: "Kvetináč, ktorý v obchode nenájdete",
        paragraphs: [
          "Tento biely kvetináč vznikol na 3D tlačiarni. Jemné zvislé rebrovanie mu dáva čistý, moderný vzhľad a pekne pracuje so svetlom — v priamom aj bočnom osvetlení vytvára hru tieňov, ktorá z obyčajného obalu na rastlinu robí dekoráciu.",
          "Vďaka 3D tlači nie je potrebná žiadna forma, takže kvetináč vieme prispôsobiť konkrétnej rastline: priemer, výšku, hrúbku steny aj tvar rebrovania.",
        ],
      },
      {
        heading: "Na mieru do bytu, kancelárie aj recepcie",
        paragraphs: [
          "Kvetináče a obaly na rastliny vieme vytlačiť v rôznych farbách a veľkostiach — jeden kus do obývačky alebo celú sadu v jednotnom dizajne pre kanceláriu, kaviareň či showroom.",
          "Stačí poslať rozmery pôvodného kvetináča alebo vlastný 3D model a my pripravíme kúsok, ktorý presne sadne.",
        ],
      },
      {
        heading: "Prečo práve 3D tlač",
        paragraphs: [
          "3D tlač umožňuje vyrobiť aj jediný kus za rozumnú cenu a bez kompromisov v dizajne. Rebrovanie, ktoré by sa inými technológiami vyrábalo zložito, vznikne priamo pri tlači vrstva po vrstve.",
        ],
      },
    ],
  },
  // ── Pripravené texty, fotky nahrá admin v CMS (dovtedy skryté) ──────────
  {
    id: "realizacia-nahradne-diely-a-suciastky",
    published: false,
    slug: "nahradne-diely-a-suciastky",
    title: "Náhradné diely a súčiastky na mieru",
    subtitle: "Diel, ktorý sa už nedá kúpiť, vytlačíme presne podľa originálu",
    description:
      "Kryty, lišty, krytky, úchytky a ďalšie súčiastky vyrobené 3D tlačou presne na mieru — keď originál praskol, chýba alebo sa už nevyrába.",
    image: "",
    category: "Náhradné diely",
    year: "2026",
    material: "PETG / ABS",
    size: "podľa originálu",
    leadTime: "2 – 4 dni",
    featured: true,
    seoKeywords: ["náhradné diely 3D tlač", "súčiastky na mieru", "výroba náhradného dielu", "3D tlač krytu", "plastové diely na mieru", "zlomený plastový diel"],
    content: [
      {
        heading: "Keď sa diel nedá kúpiť",
        paragraphs: [
          "Najčastejšie tlačíme práve náhradné diely: kryty, lišty, krytky, úchytky či vodiace prvky. Originál praskol, stratil sa alebo ho výrobca už nedodáva — a kvôli jednému kúsku plastu by inak skončilo v koši celé zariadenie.",
          "Diel vieme vytlačiť podľa hotového 3D modelu, výkresu alebo nameraných rozmerov. Pri zložitejších tvaroch pomôže fotka a pôvodný kus, podľa ktorého model pripravíme.",
        ],
      },
      {
        heading: "Pevné a presné",
        paragraphs: [
          "Na funkčné diely používame najmä PETG a ABS — sú pevnejšie, pružnejšie a znesú vyššie teploty ako bežné PLA. Výtlačok skontrolujeme rozmerovo, aby sedel na svoje miesto.",
          "Ak diel potrebujete viackrát, ďalšie kusy už vytlačíme z rovnakého modelu bez ďalšej prípravy.",
        ],
      },
    ],
  },
  {
    id: "realizacia-forma-na-kvetinac",
    published: false,
    slug: "forma-na-kvetinac",
    title: "Forma na kvetináč",
    subtitle: "3D tlačená forma na odlievanie kvetináčov",
    description:
      "Forma na výrobu kvetináčov vytlačená na 3D tlačiarni — vlastný tvar a dizajn bez drahých nástrojov, pripravená na opakované odlievanie.",
    image: "",
    category: "Diel na mieru",
    year: "2026",
    material: "PETG",
    size: "podľa návrhu",
    leadTime: "2 – 5 dní",
    seoKeywords: ["forma na kvetináč", "3D tlač formy", "forma na odlievanie", "forma na betón", "silikónová forma 3D tlač", "výroba foriem na mieru"],
    content: [
      {
        heading: "Vlastný tvar bez drahých nástrojov",
        paragraphs: [
          "Klasická forma na odlievanie býva drahá a jej výroba trvá dlho. 3D tlač umožňuje pripraviť formu presne podľa vlastného návrhu — s ľubovoľným tvarom, vzorom aj veľkosťou — a rýchlo ju upraviť, ak treba niečo zmeniť.",
          "Forma sa dá použiť priamo na odlievanie, alebo ako predloha na výrobu silikónovej formy pre väčšie série.",
        ],
      },
      {
        heading: "Na opakované použitie",
        paragraphs: [
          "Formy tlačíme z odolného materiálu s hladkými stenami, aby sa odliatok dal ľahko vybrať. Vďaka tomu vznikne z jednej formy celá séria rovnakých kvetináčov.",
        ],
      },
    ],
  },
  {
    id: "realizacia-seriova-vyroba",
    published: false,
    slug: "seriova-vyroba",
    title: "Sériová výroba",
    subtitle: "Desiatky až stovky rovnakých dielov bez foriem",
    description:
      "Malosériová výroba 3D tlačou — rovnaké diely v desiatkach až stovkách kusov, bez investície do foriem a s možnosťou kedykoľvek upraviť dizajn.",
    image: "",
    category: "Firemná výroba",
    year: "2026",
    material: "PLA / PETG",
    size: "podľa zadania",
    leadTime: "individuálne",
    featured: true,
    seoKeywords: ["sériová výroba 3D tlač", "malosériová výroba", "výroba plastových dielov", "3D tlač pre firmy", "výroba bez foriem", "opakovaná výroba dielov"],
    content: [
      {
        heading: "Séria bez investície do foriem",
        paragraphs: [
          "Pri vstrekovaní plastov sa výroba oplatí až pri tisíckach kusov, lebo forma stojí veľa. 3D tlač je ideálna pre menšie série — desiatky až stovky rovnakých dielov, ktoré potrebujete hneď a bez vstupnej investície.",
          "Každý kus tlačíme z rovnakého modelu a s rovnakými nastaveniami, takže sú diely rozmerovo aj vzhľadovo zhodné.",
        ],
      },
      {
        heading: "Výhodnejšia cena za kus",
        paragraphs: [
          "Manipulačný poplatok za prípravu dát sa pri viacerých kusoch toho istého modelu platí len raz a od 20 kusov dostanete aj množstevnú zľavu. Ak treba dizajn počas výroby upraviť, ďalšia séria už pôjde podľa nového modelu — bez prerábania foriem.",
        ],
      },
    ],
  },
  {
    id: "realizacia-prototyp-magsafe-drziaka",
    published: false,
    slug: "prototyp-magsafe-drziaka",
    title: "Prototyp MagSafe držiaka",
    subtitle: "Stojan s presným lôžkom pre magnetickú nabíjačku",
    description:
      "Prototyp stojana na telefón s lôžkom pre MagSafe nabíjačku — presné uloženie nabíjačky, otvory pre kábel a uchytenie, overené na fyzickom kuse pred finálnou výrobou.",
    image: "",
    category: "Prototypovanie",
    year: "2026",
    material: "PLA / PETG",
    size: "stolový stojan",
    leadTime: "2 – 4 dni",
    seoKeywords: ["MagSafe držiak", "MagSafe stojan 3D tlač", "prototyp držiaka telefónu", "3D tlač prototypu", "stojan na nabíjačku", "vývoj produktu 3D tlač"],
    content: [
      {
        heading: "Prototyp, ktorý sa dá chytiť do ruky",
        paragraphs: [
          "Stojan s kruhovým lôžkom pre magnetickú nabíjačku MagSafe. Lôžko musí nabíjačku presne držať, kábel musí mať kade prejsť a telefón musí na stojane bezpečne držať — to sa najlepšie overí na fyzickom kuse.",
          "Vďaka 3D tlači vznikol prototyp za pár dní. Na ňom sa vyskúšalo uloženie nabíjačky, uhol stojana aj otvory a úpravy sa premietli do ďalšej verzie.",
        ],
      },
      {
        heading: "Od nápadu k finálnemu produktu",
        paragraphs: [
          "Prototypovanie 3D tlačou je najrýchlejšia cesta, ako overiť nový produkt. Každú verziu vieme vytlačiť znova, kým nie je všetko presne tak, ako má byť — a potom aj v menšej sérii.",
        ],
      },
    ],
  },
  {
    id: "realizacia-sablona-na-razitka",
    published: false,
    slug: "sablona-na-razitka",
    title: "Šablóna na razítka",
    subtitle: "Pomôcka na presné a opakovateľné razítkovanie",
    description:
      "Šablóna na razítka vytlačená na mieru — pomôže umiestniť odtlačok vždy na rovnaké miesto a urýchli prácu pri väčšom množstve.",
    image: "",
    category: "Diel na mieru",
    year: "2026",
    material: "PLA",
    size: "podľa razítka",
    leadTime: "1 – 3 dni",
    seoKeywords: ["šablóna na razítka", "3D tlač šablóny", "pomôcka na pečiatky", "prípravok na mieru", "3D tlač pre kancelárie", "výroba šablón"],
    content: [
      {
        heading: "Každý odtlačok na svojom mieste",
        paragraphs: [
          "Pri razítkovaní väčšieho množstva dokumentov, obalov či produktov je ťažké trafiť stále to isté miesto. Šablóna vytlačená presne podľa razítka a podkladu to vyrieši — odtlačok je vždy rovnako umiestnený a práca ide rýchlejšie.",
        ],
      },
      {
        heading: "Pomôcky a prípravky na mieru",
        paragraphs: [
          "Podobné šablóny a prípravky vieme vytlačiť pre akúkoľvek opakovanú činnosť — na značenie, vŕtanie, lepenie či skladanie. Stačí poslať rozmery alebo nákres a pripravíme model presne pre váš postup.",
        ],
      },
    ],
  },
  {
    id: "realizacia-detailna-socha-anjela",
    published: false,
    slug: "detailna-socha-anjela",
    title: "Detailná socha anjela",
    subtitle: "Jemné detaily vytlačené v najvyššej kvalite",
    description:
      "Socha anjela s jemnými detailmi krídel, tváre a záhybov odevu, vytlačená v detailnej kvalite s tenkými vrstvami.",
    image: "",
    category: "Dizajn",
    year: "2026",
    material: "PLA",
    size: "dekoratívna socha",
    leadTime: "3 – 5 dní",
    featured: true,
    seoKeywords: ["3D tlač sochy", "socha anjela", "detailná 3D tlač", "3D tlač dekorácií", "tlač figúrok", "darček 3D tlač"],
    content: [
      {
        heading: "Kde rozhodujú detaily",
        paragraphs: [
          "Pri soche anjela je dôležité každé pierko na krídlach, jemné črty tváre aj záhyby odevu. Preto sme ju tlačili v detailnej kvalite s tenkými vrstvami, pri ktorej sú prechody hladké a detaily ostrejšie.",
          "Organické tvary s prevismi si vyžadujú aj starostlivo pripravené podpery, ktoré sa po tlači opatrne odstránia, aby povrch ostal čistý.",
        ],
      },
      {
        heading: "Dekorácie a darčeky",
        paragraphs: [
          "Sochy, figúrky a dekorácie sú obľúbeným darčekom aj ozdobou interiéru. Vytlačíme ich podľa hotového modelu v zvolenej farbe a veľkosti.",
        ],
      },
    ],
  },
  {
    id: "realizacia-ozubene-koliesko-z-abs",
    published: false,
    slug: "ozubene-koliesko-z-abs",
    title: "Ozubené koliesko z ABS",
    subtitle: "Funkčný technický diel odolný voči teplu a opotrebeniu",
    description:
      "Ozubené koliesko vytlačené z ABS — pevný a tepelne odolný technický diel ako náhrada za opotrebované alebo zlomené koliesko v mechanizme.",
    image: "",
    category: "Náhradné diely",
    year: "2026",
    material: "ABS",
    size: "podľa mechanizmu",
    leadTime: "2 – 4 dni",
    seoKeywords: ["ozubené koliesko 3D tlač", "ozubené koleso ABS", "náhradné ozubené koliesko", "technické diely 3D tlač", "ABS 3D tlač", "náhradný diel mechanizmu"],
    content: [
      {
        heading: "Malý diel, ktorý drží celý mechanizmus",
        paragraphs: [
          "Opotrebované alebo zlomené ozubené koliesko vie vyradiť z prevádzky celé zariadenie. 3D tlač umožňuje vyrobiť náhradu presne podľa pôvodného kusu — s rovnakým počtom zubov, priemerom aj uchytením na hriadeľ.",
        ],
      },
      {
        heading: "Prečo ABS",
        paragraphs: [
          "ABS je pevný a húževnatý materiál, ktorý znesie vyššie teploty a mechanické namáhanie lepšie ako PLA. Preto je vhodný na funkčné technické diely, ktoré sú v pohybe alebo v teplejšom prostredí.",
          "Pri ozubených kolieskach dbáme na presnosť zubov a dostatočnú výplň, aby diel bezpečne prenášal silu.",
        ],
      },
    ],
  },
];
