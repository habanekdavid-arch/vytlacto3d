/**
 * Viacfarebná tlač: zákazník v 3D náhľade zafarbí jednotlivé časti modelu
 * (samostatné telesá v STL) farbami z palety. Pravidlá platia v prehliadači
 * aj na serveri pri objednávke.
 */
// Bez importov z lib/pricing a lib/print-options — pricing odtiaľto berie
// poplatok a kruhový import by pri štarte rozbil konštanty.

/** Najviac toľko rôznych farieb na jeden model (sloty AMS). */
export const MULTICOLOR_MAX_COLORS = 4;
/** Poplatok za viacfarebnú tlač — € bez DPH, raz za model (položku). */
export const MULTICOLOR_FEE_EUR = 10;
/** Viacfarebne tlačíme len PLA. */
export const MULTICOLOR_MATERIALS: readonly string[] = ["PLA"];
/** Viac častí by sa v náhľade nedalo rozumne klikať ani vyrobiť. */
export const MULTICOLOR_MAX_PARTS = 64;
/** Farby, ktorými sa dá farbiť (PLA na sklade v AMS). */
export const MULTICOLOR_COLORS: readonly string[] = ["black", "white", "gray", "red", "blue", "green", "purple", "orange"];

export function multicolorAllowedFor(material: string): boolean {
  return MULTICOLOR_MATERIALS.includes(material);
}

/** Rôzne farby použité na modeli. */
export function distinctColors(partColors: readonly string[] | null | undefined): string[] {
  return Array.from(new Set((partColors ?? []).filter(Boolean)));
}

/** Je položka naozaj viacfarebná (aspoň dve rôzne farby)? */
export function isMulticolor(partColors: readonly string[] | null | undefined): boolean {
  return distinctColors(partColors).length >= 2;
}

/**
 * Kontrola na serveri. Vráti chybovú hlášku alebo null. Neplatné farby,
 * viac ako 4 farby, iný materiál ako PLA alebo podozrivo veľa častí
 * objednávku zastavia — nedalo by sa ju vyrobiť tak, ako ju zákazník videl.
 */
export function validatePartColors(
  material: string,
  partColors: unknown,
  knownColors: Record<string, unknown>
): string | null {
  if (partColors === undefined || partColors === null) return null;
  if (!Array.isArray(partColors)) return "Neplatné farby častí modelu.";
  if (partColors.length > MULTICOLOR_MAX_PARTS) return "Model má priveľa častí na viacfarebnú tlač.";
  if (partColors.some((c) => typeof c !== "string" || !(c in knownColors))) return "Neplatná farba časti modelu.";
  if (!isMulticolor(partColors as string[])) return null;
  if (!multicolorAllowedFor(material)) return "Viacfarebnú tlač robíme len z PLA.";
  if (distinctColors(partColors as string[]).length > MULTICOLOR_MAX_COLORS) {
    return `Na jednom modeli môžu byť najviac ${MULTICOLOR_MAX_COLORS} farby.`;
  }
  return null;
}
