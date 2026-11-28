/**
 * Rohplan eines K.o.-Teils vor dem Auflösen der Freilose.
 *
 * Die Bausteine erzeugen Spiele mit sprechenden Schlüsseln; Freilose sind eigene Platzhalter.
 * `simplifyByes` (byes.ts) entfernt danach alle Freilos-Spiele und nummeriert Plätze neu (Q9).
 */

export type RawSlot =
  | { readonly kind: 'groupRank'; readonly groupIndex: number; readonly rank: number }
  | { readonly kind: 'winnerOf'; readonly key: string }
  | { readonly kind: 'loserOf'; readonly key: string }
  | { readonly kind: 'bye' };

export interface RawMatch {
  readonly key: string;
  readonly sectionId: string;
  readonly round: number;
  readonly slotA: RawSlot;
  readonly slotB: RawSlot;
  /** Platzbereich im Rohplan (mit Freilos-Plätzen). */
  readonly placeFrom: number;
  readonly placeTo: number;
  /** Letztes Spiel eines Zweigs: Sieger erhält `placeFrom`, Verlierer `placeFrom + 1`. */
  readonly terminal: boolean;
  readonly playIn?: boolean;
}

export interface RawSection {
  readonly id: string;
  readonly title: string;
}

export interface RawPlan {
  readonly sections: readonly RawSection[];
  readonly matches: readonly RawMatch[];
  /** Teams ohne weiteres Spiel mit geteiltem Platz, z. B. 5.G3 und 5.G4 im 20er-Plan (Q26). */
  readonly unplayed: readonly { readonly slot: RawSlot; readonly place: number }[];
}

export const rank = (groupIndex: number, r: number): RawSlot => ({
  kind: 'groupRank',
  groupIndex,
  rank: r,
});
export const winnerOf = (key: string): RawSlot => ({ kind: 'winnerOf', key });
export const loserOf = (key: string): RawSlot => ({ kind: 'loserOf', key });

/**
 * Platzierungsbaum nach der Baumregel (groups-full-placement.md „Baumregel“):
 * Sieger der Spiele 2i−1 und 2i spielen um die oberen Plätze, Verlierer um die unteren,
 * bis jeder Platz feststeht. `entries.length` muss eine Zweierpotenz sein.
 */
export function placementTree(
  entries: readonly (readonly [RawSlot, RawSlot])[],
  placeFrom: number,
  sectionId: string,
  round: number,
): RawMatch[] {
  if (entries.length === 0 || (entries.length & (entries.length - 1)) !== 0) {
    throw new RangeError(`Baum braucht 2^k Spiele, nicht ${String(entries.length)}.`);
  }
  const placeTo = placeFrom + entries.length * 2 - 1;
  const terminal = entries.length === 1;
  const matches = entries.map(([slotA, slotB], i): RawMatch => ({
    key: `P${String(placeFrom)}-${String(placeTo)}/R${String(round)}/${String(i + 1)}`,
    sectionId,
    round,
    slotA,
    slotB,
    placeFrom,
    placeTo,
    terminal,
  }));
  if (terminal) return matches;
  const winners = pairUp(matches.map((m) => winnerOf(m.key)));
  const losers = pairUp(matches.map((m) => loserOf(m.key)));
  return [
    ...matches,
    ...placementTree(winners, placeFrom, sectionId, round + 1),
    ...placementTree(losers, placeFrom + entries.length, sectionId, round + 1),
  ];
}

export function pairUp<T>(items: readonly T[]): [T, T][] {
  const pairs: [T, T][] = [];
  for (let i = 0; i + 1 < items.length; i += 2) {
    const a = items[i];
    const b = items[i + 1];
    if (a !== undefined && b !== undefined) pairs.push([a, b]);
  }
  return pairs;
}
