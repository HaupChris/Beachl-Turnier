import { simplifyByes } from './byes';
import { firstRound, winnersOrder } from './firstRound';
import {
  loserOf,
  pairUp,
  placementTree,
  rank,
  type RawMatch,
  type RawPlan,
  type RawSlot,
  winnerOf,
} from './rawPlan';
import type { KnockoutInput, KnockoutPlan } from './types';

/**
 * Short Main: Gruppenplätze 1–3 im Hauptfeld, 4 und 5 im unteren Feld
 * (Q19, Q26, Q35, Q37, Q48; groups-split-bracket.md).
 */
export function planSplitBracket(input: KnockoutInput): KnockoutPlan {
  const groupCount = input.groupSizes.length;
  const capacity = Math.max(...input.groupSizes);
  const main = groupCount === 4 ? mainBracketFourGroups() : mainBracketByTree(groupCount);
  const mainPlaces = Math.max(...main.map((m) => m.placeTo));
  const lower = lowerBracket(groupCount, capacity, mainPlaces + 1);

  return simplifyByes(
    {
      sections: [
        { id: 'main', title: 'Hauptfeld' },
        { id: 'lower', title: '' },
      ],
      matches: [...main, ...lower.matches],
      unplayed: lower.unplayed,
    },
    input.groupSizes,
  );
}

/** 2 und 8 Gruppen: Baum von Full Placement, die Plätze „4.Gx“ sind Freilose (Q19). */
function mainBracketByTree(groupCount: number): RawMatch[] {
  const slot = (r: number, group: number): RawSlot =>
    r === 4 ? { kind: 'bye' } : rank(group - 1, r);
  const entries = firstRound(groupCount).map(
    ([rankA, groupA, rankB, groupB]) => [slot(rankA, groupA), slot(rankB, groupB)] as const,
  );
  return placementTree(entries, 1, 'main', 1);
}

/**
 * 4 Gruppen (12er-, 16er-, 20er-Plan): Quali 2. gegen 3., Viertelfinale gegen die
 * Gruppensieger (Q19, Q37). Platz 9–12 ohne Treffen aus derselben Gruppe (Q35).
 */
function mainBracketFourGroups(): RawMatch[] {
  const qualiPairs: [number, number][] = [
    [2, 1], // Q1: 2.G3 – 3.G2
    [1, 2], // Q2: 2.G2 – 3.G3
    [0, 3], // Q3: 2.G1 – 3.G4
    [3, 0], // Q4: 2.G4 – 3.G1
  ];
  const quali = qualiPairs.map(([second, third], i): RawMatch => ({
    key: `Q${String(i + 1)}`,
    sectionId: 'main',
    round: 1,
    slotA: rank(second, 2),
    slotB: rank(third, 3),
    placeFrom: 1,
    placeTo: 16,
    terminal: false,
  }));
  const quarterfinals = placementTree(
    [
      [rank(0, 1), winnerOf('Q1')],
      [rank(3, 1), winnerOf('Q2')],
      [rank(2, 1), winnerOf('Q3')],
      [rank(1, 1), winnerOf('Q4')],
    ],
    1,
    'main',
    2,
  );
  const qualiLosers = placementTree(
    [
      [loserOf('Q3'), loserOf('Q1')],
      [loserOf('Q4'), loserOf('Q2')],
    ],
    9,
    'main',
    2,
  );
  return [...quali, ...quarterfinals, ...qualiLosers];
}

/** Unteres Feld für die Gruppenplätze 4 und 5 (Q26, Q48). */
function lowerBracket(
  groupCount: number,
  capacity: number,
  placeFrom: number,
): Pick<RawPlan, 'matches' | 'unplayed'> {
  if (capacity <= 3) return { matches: [], unplayed: [] };

  if (capacity === 4) {
    // Q48: Gruppenvierte paarweise in der Reihenfolge der Gruppensieger im Hauptfeld.
    const entries = pairUp(winnersOrder(groupCount).map((g) => rank(g, 4)));
    return { matches: placementTree(entries, placeFrom, 'lower', 1), unplayed: [] };
  }

  if (groupCount === 2) {
    // 10er-Plan: 4.G1–5.G2 und 5.G1–4.G2, danach Platz 7 und 9 (Q26).
    const entries = [
      [rank(0, 4), rank(1, 5)],
      [rank(0, 5), rank(1, 4)],
    ] as const;
    return { matches: placementTree(entries, placeFrom, 'lower', 1), unplayed: [] };
  }

  // 20er-Plan (4×5): 5.G3 und 5.G4 spielen nicht weiter, geteilter Platz (Q26).
  const opening = (key: string, slotA: RawSlot, slotB: RawSlot): RawMatch => ({
    key,
    sectionId: 'lower',
    round: 1,
    slotA,
    slotB,
    placeFrom,
    placeTo: placeFrom + 5,
    terminal: false,
  });
  const u1 = opening('U1', rank(0, 5), rank(3, 4));
  const u2 = opening('U2', rank(1, 5), rank(2, 4));
  const winnersTree = placementTree(
    [
      [winnerOf('U1'), rank(1, 4)],
      [winnerOf('U2'), rank(0, 4)],
    ],
    placeFrom,
    'lower',
    2,
  );
  const losersTree = placementTree([[loserOf('U1'), loserOf('U2')]], placeFrom + 4, 'lower', 2);
  return {
    matches: [u1, u2, ...winnersTree, ...losersTree],
    unplayed: [
      { slot: rank(2, 5), place: placeFrom + 6 },
      { slot: rank(3, 5), place: placeFrom + 6 },
    ],
  };
}
