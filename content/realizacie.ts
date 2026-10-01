/**
 * Realizácie doplnené z fotiek v priečinku nahraj-realizacie/ (pozri jeho README).
 *
 * Web si pri štarte každú novú položku sám vloží do databázy (lib/realizacie-sync.ts),
 * takže sa objaví na /realizacie aj v CMS. Vloží ju iba raz — neskoršie úpravy
 * alebo zmazanie v CMS sa už neprepíšu ani nevrátia späť.
 */

export type RepoRealizacia = {
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
];
