import { simplifyByes } from './byes';
import { firstRound, fourthsOrder } from './firstRound';
import {
  loserOf,
  pairUp,
  placementTree,
  rank,
  type RawMatch,
  type RawSlot,
  winnerOf,
} from './rawPlan';
import { planSplitBracket } from './splitBracket';
import type { KnockoutInput, KnockoutPlan } from './types';

/**
 * Gegner im Vorschaltspiel: Der Sieger von 4.Gx – 5.Gy übernimmt den Platz „4.Gx“ (Q27).
 * Die Gegner sind so gewählt, dass in Runde 2 kein Team aus der eigenen Gruppe wartet.
 * Schlüssel und Werte 0-basiert.
 */
const PLAY_IN_OPPONENT: Readonly<Record<number, Readonly<Record<number, number>>>> = {
  2: { 1: 0, 0: 1 },
  4: { 3: 2, 0: 1, 1: 0, 2: 3 },
};

/**
 * Full Placement: alle kommen weiter, jeder Platz wird ausgespielt
 * (Q19, Q27, Q36; groups-full-placement.md).
 */
export function planFullPlacement(input: KnockoutInput): KnockoutPlan {
  const groupCount = input.groupSizes.length;
  const capacity = Math.max(...input.groupSizes);

  // Q36: Bei 4 Gruppen ohne Gruppenvierte ist Full Placement identisch mit Short Main.
  if (groupCount === 4 && capacity <= 3) return planSplitBracket(input);

  const playIns: RawMatch[] = [];
  const playInKey = (groupIndex: number) => `PI-G${String(groupIndex + 1)}`;
  if (capacity === 5) {
    const opponents = PLAY_IN_OPPONENT[groupCount];
    if (!opponents) throw new RangeError(`Keine 5er-Gruppen bei ${String(groupCount)} Gruppen.`);
    for (const groupIndex of fourthsOrder(groupCount)) {
      playIns.push({
        key: playInKey(groupIndex),
        sectionId: 'playIn',
        round: 1,
        slotA: rank(groupIndex, 4),
        slotB: rank(opponents[groupIndex] ?? -1, 5),
        placeFrom: 1,
        placeTo: groupCount * 5,
        terminal: false,
        playIn: true,
      });
    }
  }

  const slot = (r: number, group: number): RawSlot =>
    r === 4 && capacity === 5 ? winnerOf(playInKey(group - 1)) : rank(group - 1, r);
  const entries = firstRound(groupCount).map(
    ([rankA, groupA, rankB, groupB]) => [slot(rankA, groupA), slot(rankB, groupB)] as const,
  );
  const mainRound = capacity === 5 ? 2 : 1;
  const main = placementTree(entries, 1, 'main', mainRound);

  const playInLosers =
    playIns.length > 0
      ? placementTree(
          pairUp(playIns.map((m) => loserOf(m.key))),
          groupCount * 4 + 1,
          'playInLosers',
          2,
        )
      : [];

  return simplifyByes(
    {
      sections: [
        { id: 'playIn', title: 'Vorschaltspiele' },
        { id: 'main', title: 'Platzierungsbaum' },
        { id: 'playInLosers', title: '' },
      ],
      matches: [...playIns, ...main, ...playInLosers],
      unplayed: [],
    },
    input.groupSizes,
  );
}
