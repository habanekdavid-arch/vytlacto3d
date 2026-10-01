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

export const repoRealizacie: RepoRealizacia[] = [];
