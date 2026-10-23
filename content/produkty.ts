import type { CartItemConfig } from "@/lib/types";

/**
 * Hotové 3D produkty. Zákazník si produkt nekupuje priamo — vloží ho do
 * konfigurátora, prispôsobí (materiál, farba, kvalita, výplň, mierka,
 * počet kusov) a objedná ako bežný výtlačok. Cena sa počíta rovnako ako
 * pri vlastnom modeli.
 *
 * Nový produkt: STL súbor a obrázok do `public/produkty/`, záznam sem.
 */
export type ProductAnalysis = {
  dimsXmm: number;
  dimsYmm: number;
  dimsZmm: number;
  volumeCm3: number;
  surfaceAreaCm2?: number;
  supportCm3?: number;
  printHeightMm?: number;
};

export type Product = {
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  category: string;
  /** STL model v `public/` — cesta od koreňa webu. */
  file: string;
  /** Náhľad produktu v `public/` — cesta od koreňa webu. */
  image: string;
  /** Rozmery pri mierke 100 % (Š × H × V), len na zobrazenie. */
  dimsMm: [number, number, number];
  highlights: string[];
  /**
   * Výsledok analýzy modelu (rovnaký ako z /api/analyze), aby sa produkt
   * vložil do konfigurátora bez sťahovania modelu na serveri. Chýba → web
   * model analyzuje pri vložení.
   */
  analysis?: ProductAnalysis;
  /**
   * Odporúčané nastavenie, s ktorým sa produkt otvorí v konfigurátore.
   * `partColors` = viacfarebný produkt: farby dielov v poradí od najväčšieho
   * (lib/model-parts), len PLA; účtuje sa poplatok za viacfarebnú tlač.
   */
  defaults?: Partial<Pick<CartItemConfig, "material" | "quality" | "infillPct" | "color" | "partColors">>;
  /** Poplatok za model (€ bez DPH); chýba → PRODUCT_MODEL_FEE_EUR, 0 = bez poplatku. */
  modelFeeEur?: number;
};

/** Poplatok za hotový model z katalógu — € bez DPH, raz za položku (nie za kus). */
export const PRODUCT_MODEL_FEE_EUR = 5;

export const PRODUCTS: Product[] = [
  {
    slug: "roztomily-duch",
    name: "Roztomilý duch",
    subtitle: "Viacfarebná halloweenska dekorácia",
    description:
      "Usmiaty duch na poličku, stôl alebo do okna. Telo tlačíme v bielej, oči a ústa v čiernej — každý diel vo vlastnej farbe, bez farbenia. Farby dielov si v konfigurátore zmeníte podľa seba.",
    category: "Halloween",
    file: "/produkty/roztomily-duch.stl",
    analysis: { dimsXmm: 74.89, dimsYmm: 72.77, dimsZmm: 80, volumeCm3: 236.15, surfaceAreaCm2: 209.55, supportCm3: 2.73, printHeightMm: 80 },
    image: "/produkty/roztomily-duch.jpg",
    dimsMm: [75, 73, 80],
    highlights: ["Viacfarebná tlač bez farbenia", "Oči a ústa sú samostatné diely", "Darček aj dekorácia na Halloween"],
    defaults: { material: "PLA", quality: "STANDARD", infillPct: 15, color: "white", partColors: ["white", "black", "black", "black"] },
  },
  {
    slug: "roztomily-netopier",
    name: "Roztomilý netopier",
    subtitle: "Viacfarebný netopier s tesákmi",
    description:
      "Malý netopier s veľkými očami a dvoma tesákmi. Telo tlačíme vo fialovej, oči a ústa v bielej — každý diel vo vlastnej farbe, bez farbenia. V konfigurátore mu jedným klikom dáte napríklad čierne telo.",
    category: "Halloween",
    file: "/produkty/roztomily-netopier.stl",
    analysis: { dimsXmm: 73.38, dimsYmm: 62.12, dimsZmm: 70.71, volumeCm3: 150.48, surfaceAreaCm2: 153.8, supportCm3: 3, printHeightMm: 70.71 },
    image: "/produkty/roztomily-netopier.jpg",
    dimsMm: [73, 62, 71],
    highlights: ["Viacfarebná tlač bez farbenia", "Fialový alebo čierny — vyberiete si", "Hodí sa k duchovi a tekvici"],
    defaults: { material: "PLA", quality: "STANDARD", infillPct: 15, color: "purple", partColors: ["purple", "white", "white", "white"] },
  },
  {
    slug: "halloweenska-tekvica",
    name: "Halloweenska tekvica",
    subtitle: "Usmiata tekvica so stonkou a lístkom",
    description:
      "Klasická halloweenska tekvica s vyrezanou tvárou. Tekvicu tlačíme v oranžovej, stonku so lístkom v zelenej a tvár v čiernej — každý diel vo vlastnej farbe, bez farbenia. Farby si v konfigurátore zmeníte podľa seba.",
    category: "Halloween",
    file: "/produkty/halloweenska-tekvica.stl",
    analysis: { dimsXmm: 96.73, dimsYmm: 94.94, dimsZmm: 69.98, volumeCm3: 293.05, surfaceAreaCm2: 253.55, supportCm3: 20.18, printHeightMm: 94.94 },
    image: "/produkty/halloweenska-tekvica.jpg",
    dimsMm: [97, 95, 70],
    highlights: ["Tri farby: tekvica, stonka a tvár", "Viacfarebná tlač bez farbenia", "Najznámejší symbol Halloweenu"],
    defaults: { material: "PLA", quality: "STANDARD", infillPct: 15, color: "orange", partColors: ["orange", "green", "black", "black", "black"] },
  },
  {
    slug: "carodejnicky-kotlik",
    name: "Čarodejnícky kotlík",
    subtitle: "Kotlík s bublajúcim elixírom",
    description:
      "Čierny kotlík na troch nožičkách, plný bublajúceho elixíru. Kotlík tlačíme v čiernej, elixír v zelenej — dá sa zmeniť napríklad na fialový alebo oranžový. Hodí sa ako dekorácia aj miska na drobné sladkosti pri stole.",
    category: "Halloween",
    file: "/produkty/carodejnicky-kotlik.stl",
    analysis: { dimsXmm: 82.45, dimsYmm: 82.45, dimsZmm: 54.25, volumeCm3: 209.73, surfaceAreaCm2: 271.78, supportCm3: 36.59, printHeightMm: 54.25 },
    image: "/produkty/carodejnicky-kotlik.jpg",
    dimsMm: [82, 82, 54],
    highlights: ["Elixír v inej farbe ako kotlík", "Zelený, fialový alebo oranžový elixír", "Doplnok k duchovi, netopierovi a tekvici"],
    defaults: { material: "PLA", quality: "STANDARD", infillPct: 15, color: "black", partColors: ["black", "green"] },
  },
  {
    slug: "skrutena-vaza",
    name: "Skrútená váza",
    subtitle: "Dizajnová váza s hviezdicovým prierezom",
    description:
      "Váza so skrúteným rebrovaním, ktoré na svetle vytvára výrazné tiene. Hodí sa na sušené kvety aj ako samostatná dekorácia. Vyberte si farbu a veľkosť podľa svojho interiéru.",
    category: "Domácnosť",
    file: "/produkty/skrutena-vaza.stl",
    analysis: { dimsXmm: 90.88, dimsYmm: 92.03, dimsZmm: 150, volumeCm3: 272.42, surfaceAreaCm2: 882.42, supportCm3: 0, printHeightMm: 150 },
    image: "/produkty/skrutena-vaza.jpg",
    dimsMm: [91, 92, 150],
    highlights: ["Dekorácia na sušené kvety", "Odporúčaná mierka 80–140 %", "Pekne vynikne v bielej alebo oranžovej"],
    defaults: { material: "PLA", quality: "STANDARD", infillPct: 15, color: "orange" },
  },
  {
    slug: "rebrovany-kvetinac",
    name: "Rebrovaný kvetináč",
    subtitle: "Obal na izbovú rastlinu s jemnými rebrami",
    description:
      "Kvetináč s rebrovaným povrchom a rovnou vnútornou stenou. Vojde doň plastový kvetináč s priemerom do 9 cm. Na rastliny vonku odporúčame PETG.",
    category: "Domácnosť",
    file: "/produkty/rebrovany-kvetinac.stl",
    analysis: { dimsXmm: 131.2, dimsYmm: 131.2, dimsZmm: 95, volumeCm3: 208.81, surfaceAreaCm2: 867.9, supportCm3: 0, printHeightMm: 95 },
    image: "/produkty/rebrovany-kvetinac.jpg",
    dimsMm: [131, 131, 95],
    highlights: ["Pre kvetináč do Ø 9 cm", "PETG pre vonkajšie použitie", "Rebrá skryjú vrstvy tlače"],
    defaults: { material: "PETG", quality: "STANDARD", infillPct: 15, color: "green" },
  },
  {
    slug: "organizer-na-pera",
    name: "Organizér na perá",
    subtitle: "Šesťhranný stojan na perá a ceruzky",
    description:
      "Jednoduchý šesťhranný stojan na písacie potreby. Viac kusov vedľa seba vytvorí plástový organizér na pracovný stôl. Pri 20 a viac kusoch platí množstevná zľava.",
    category: "Kancelária",
    file: "/produkty/organizer-na-pera.stl",
    analysis: { dimsXmm: 72, dimsYmm: 62.35, dimsZmm: 100, volumeCm3: 114.6, surfaceAreaCm2: 447.89, supportCm3: 0, printHeightMm: 100 },
    image: "/produkty/organizer-na-pera.jpg",
    dimsMm: [72, 62, 100],
    highlights: ["Skladá sa do plástu", "Zľava od 20 kusov", "Vhodný aj ako firemný darček"],
    defaults: { material: "PLA", quality: "STANDARD", infillPct: 20, color: "black" },
  },
  {
    slug: "stojan-na-mobil",
    name: "Stojan na mobil",
    subtitle: "Stabilný stojan na telefón alebo malý tablet",
    description:
      "Stojan s mierne zakloneným opierkom na sledovanie videí alebo videohovory. Spredu má zarážku, aby telefón nekĺzal, a zozadu vzperu, ktorá opierku drží pevne. Pre väčší tablet zväčšite mierku.",
    category: "Kancelária",
    file: "/produkty/stojan-na-mobil.stl",
    analysis: { dimsXmm: 72, dimsYmm: 90, dimsZmm: 95, volumeCm3: 152.14, surfaceAreaCm2: 387.39, supportCm3: 0, printHeightMm: 72 },
    image: "/produkty/stojan-na-mobil.jpg",
    dimsMm: [72, 90, 95],
    highlights: ["Telefón aj malý tablet", "Zadná vzpera — opierka sa neprehne", "Mierka 120 % pre tablet"],
    defaults: { material: "PLA", quality: "STANDARD", infillPct: 20, color: "gray" },
  },
];

export function getProduct(slug: string | null | undefined): Product | null {
  return PRODUCTS.find((p) => p.slug === slug) ?? null;
}

export function productModelFee(product: Product): number {
  return product.modelFeeEur ?? PRODUCT_MODEL_FEE_EUR;
}

/**
 * Poplatok za model podľa súboru položky. Produkt sa do košíka vkladá s plnou
 * adresou súboru (https://…/produkty/x.stl) — server tak pozná, že ide
 * o hotový model, a poplatok nezávisí od toho, čo pošle prehliadač.
 */
export function modelFeeForFileKey(fileKey: unknown): number {
  if (typeof fileKey !== "string" || !fileKey) return 0;
  let path = fileKey;
  try {
    path = new URL(fileKey, "https://vytlacto3d.sk").pathname;
  } catch {
    return 0;
  }
  const product = PRODUCTS.find((p) => p.file === path);
  return product ? productModelFee(product) : 0;
}
