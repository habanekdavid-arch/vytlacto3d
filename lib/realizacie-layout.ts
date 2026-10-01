/**
 * Rozloženie dlaždíc na /realizacie tak, aby do seba vždy presne zapadli —
 * bez dier a bez neúplného posledného riadku, pri akomkoľvek počte realizácií
 * a akomkoľvek počte veľkých (featured).
 *
 * Desktop (4 stĺpce): veľká dlaždica 2×2 + vedľa nej polovica 2×2 vyplnená
 * malými (4× 1×1, alebo 2×1 + 2× 1×1, alebo 2× 2×1, alebo jedna 2×2).
 * Strana veľkej sa strieda. Zvyšné malé idú do riadkov po 4 / 3 / 2.
 * Tablet (2 stĺpce): veľká 2×2, malé po dvoch, nepárna malá na celú šírku.
 * Poradie v DOM zodpovedá automatickému umiestňovaniu CSS gridu.
 */

export type LgSpan = "1x1" | "2x1" | "2x2" | "4x1" | "4x2";
export type MdSpan = "1x1" | "2x1" | "2x2";

export type Tile<T> = { item: T; lg: LgSpan; md: MdSpan; large: boolean };

type Placed<T> = { item: T; lg: LgSpan; featured: boolean };

/** Polovica 2×2 vedľa veľkej dlaždice, rozdelená na horný a dolný riadok. */
function fillHalf<T>(companions: T[]): { top: Placed<T>[]; bottom: Placed<T>[] } {
  const p = (item: T, lg: LgSpan): Placed<T> => ({ item, lg, featured: false });
  const [a, b, c, d] = companions;
  switch (companions.length) {
    case 4:
      return { top: [p(a, "1x1"), p(b, "1x1")], bottom: [p(c, "1x1"), p(d, "1x1")] };
    case 3:
      return { top: [p(a, "2x1")], bottom: [p(b, "1x1"), p(c, "1x1")] };
    case 2:
      return { top: [p(a, "2x1")], bottom: [p(b, "2x1")] };
    case 1:
      return { top: [p(a, "2x2")], bottom: [] };
    default:
      return { top: [], bottom: [] };
  }
}

function rowSizes(n: number): number[] {
  const rows: number[] = [];
  while (n > 0) {
    if (n === 5) {
      rows.push(3, 2);
      break;
    }
    const take = n <= 4 ? n : 4;
    rows.push(take);
    n -= take;
  }
  return rows;
}

/**
 * Koľko dvojíc veľkých dať vedľa seba: najmenej, aby každá samostatná veľká
 * mala vedľa seba aspoň 2 malé (inak by z nej bola obrovská dlaždica cez
 * celú šírku alebo by malá vyzerala ako veľká).
 */
function bigPairs(bigCount: number, smallCount: number): number {
  for (let p = 0; p <= Math.floor(bigCount / 2); p++) {
    const solo = bigCount - 2 * p;
    if (solo === 0 || smallCount >= 2 * solo) return p;
  }
  return Math.floor(bigCount / 2);
}

function layoutLg<T>(items: T[], isFeatured: (item: T) => boolean): Placed<T>[] {
  const big = items.filter(isFeatured);
  const small = items.filter((i) => !isFeatured(i));
  const out: Placed<T>[] = [];
  let bigOnRight = false;

  let pairsLeft = bigPairs(big.length, small.length);
  let soloLeft = big.length - 2 * pairsLeft;
  let band = 0;

  while (big.length) {
    const f: Placed<T> = { item: big.shift()!, lg: "2x2", featured: true };
    let half: { top: Placed<T>[]; bottom: Placed<T>[] };

    // Dvojice veľkých sa striedajú so samostatnými, aby stránka nebola monotónna.
    const usePair = pairsLeft > 0 && big.length > 0 && (soloLeft === 0 || band % 2 === 1);
    if (usePair) {
      pairsLeft -= 1;
      half = { top: [{ item: big.shift()!, lg: "2x2", featured: true }], bottom: [] };
    } else {
      soloLeft -= 1;
      // Nechaj aspoň 2 malé pre každú ďalšiu samostatnú veľkú.
      let take = Math.max(0, Math.min(4, small.length - 2 * soloLeft));
      // Pri poslednej veľkej nesmie zvýšiť jediná malá (bol by z nej pás cez celú šírku).
      if (soloLeft === 0 && pairsLeft === 0 && small.length - take === 1 && take >= 3) take -= 1;
      half = fillHalf(small.splice(0, take));
    }
    band += 1;

    if (!half.top.length) {
      out.push({ ...f, lg: "4x2" });
    } else if (bigOnRight) {
      out.push(...half.top, f, ...half.bottom);
    } else {
      out.push(f, ...half.top, ...half.bottom);
    }
    bigOnRight = !bigOnRight;
  }

  let wideFirst = true;
  for (const size of rowSizes(small.length)) {
    const row = small.splice(0, size);
    const p = (item: T, lg: LgSpan): Placed<T> => ({ item, lg, featured: false });
    if (size === 4) out.push(...row.map((i) => p(i, "1x1")));
    else if (size === 3) {
      const [w, ...rest] = row;
      const smalls = rest.map((i) => p(i, "1x1"));
      out.push(...(wideFirst ? [p(w, "2x1"), ...smalls] : [...smalls, p(w, "2x1")]));
      wideFirst = !wideFirst;
    } else if (size === 2) out.push(...row.map((i) => p(i, "2x1")));
    else out.push(p(row[0], "4x1"));
  }

  return out;
}

export function layoutRealizacie<T>(items: T[], isFeatured: (item: T) => boolean): Tile<T>[] {
  const placed = layoutLg(items, isFeatured);

  // Tablet: veľké na celú šírku, malé po dvoch; nepárna malá v rade pred veľkou
  // (alebo na konci) sa roztiahne na celú šírku.
  const md: MdSpan[] = placed.map((p) => (p.featured ? "2x2" : "1x1"));
  let run: number[] = [];
  const closeRun = () => {
    if (run.length % 2 === 1) md[run[run.length - 1]] = "2x1";
    run = [];
  };
  placed.forEach((p, i) => {
    if (p.featured) closeRun();
    else run.push(i);
  });
  closeRun();

  return placed.map((p, i) => ({
    item: p.item,
    lg: p.lg,
    md: md[i],
    large: p.lg === "2x2" || p.lg === "4x2" || p.lg === "4x1",
  }));
}

/** Tailwind triedy musia byť napísané celé, aby ich build našiel. */
export const LG_CLASS: Record<LgSpan, string> = {
  "1x1": "lg:col-span-1 lg:row-span-1",
  "2x1": "lg:col-span-2 lg:row-span-1",
  "2x2": "lg:col-span-2 lg:row-span-2",
  "4x1": "lg:col-span-4 lg:row-span-1",
  "4x2": "lg:col-span-4 lg:row-span-2",
};

export const MD_CLASS: Record<MdSpan, string> = {
  "1x1": "md:col-span-1 md:row-span-1",
  "2x1": "md:col-span-2 md:row-span-1",
  "2x2": "md:col-span-2 md:row-span-2",
};
