import { prisma } from "@/lib/prisma";

const PREFIX = "VYT3D-";
const START = 1432;
const MAX_ATTEMPTS = 5;

/**
 * Poradové číslo z čísla objednávky, alebo null ak sa nedá prečítať.
 */
function sequenceOf(orderNumber: string): number | null {
  const seq = Number.parseInt(orderNumber.slice(PREFIX.length), 10);
  return Number.isFinite(seq) ? seq : null;
}

/**
 * Ďalšie voľné číslo objednávky.
 *
 * Odvodzuje sa z najvyššieho už použitého čísla, nie z počtu objednávok:
 * počet po zmazaní objednávky klesne a poradie by ukázalo na číslo, ktoré
 * niekto iný už má. Radenie v databáze je textové (`VYT3D-999` by vyšlo
 * vyššie ako `VYT3D-1000`), preto sa maximum počíta číselne tu.
 */
async function nextOrderNumber(): Promise<string> {
  const existing = await prisma.order.findMany({
    where: { orderNumber: { startsWith: PREFIX } },
    select: { orderNumber: true },
  });

  let highest = START - 1;

  for (const row of existing) {
    if (!row.orderNumber) continue;

    const seq = sequenceOf(row.orderNumber);
    if (seq !== null && seq > highest) highest = seq;
  }

  return `${PREFIX}${highest + 1}`;
}

/**
 * Zlyhalo zapísanie na jedinečnosti čísla objednávky?
 */
function isDuplicateOrderNumber(error: unknown): boolean {
  const err = error as { code?: string; meta?: { target?: unknown } } | null;

  if (err?.code !== "P2002") return false;

  const target = err.meta?.target;
  const fields = Array.isArray(target) ? target.map(String) : [String(target ?? "")];

  return fields.some((field) => field.includes("orderNumber"));
}

/**
 * Vytvorí objednávku s prideleným číslom.
 *
 * Medzi zistením najvyššieho čísla a zápisom môže rovnaké číslo obsadiť súbežná
 * objednávka — vtedy zápis padne na jedinečnosti a číslo sa prideľuje odznova.
 * Bez toho by druhý zákazník dostal chybu 500 len preto, že objednával v tú
 * istú sekundu.
 */
export async function createOrderWithNumber<T>(
  create: (orderNumber: string) => Promise<T>
): Promise<T> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const orderNumber = await nextOrderNumber();

    try {
      return await create(orderNumber);
    } catch (error) {
      if (!isDuplicateOrderNumber(error)) throw error;

      console.warn(`Číslo objednávky ${orderNumber} medzitým obsadila iná objednávka, skúšam ďalšie.`);
      lastError = error;
    }
  }

  throw lastError ?? new Error("Nepodarilo sa prideliť číslo objednávky.");
}
