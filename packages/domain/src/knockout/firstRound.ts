/**
 * Runde 1 des Platzierungsbaums je Gruppenzahl (Q19; groups-full-placement.md „Runde 1“).
 * Einträge: [Rang A, Gruppe A, Rang B, Gruppe B], Gruppen 1-basiert (1 = G1).
 *
 * - 2 Gruppen: 8er-Plan
 * - 4 Gruppen: 16er-Plan, bestätigt durch den 12er-Plan
 * - 8 Gruppen: 24er-Plan (Spiele 2. gegen 3.); 1. gegen 4. nach dem Muster der 4 Gruppen ergänzt
 */
export type FirstRoundEntry = readonly [number, number, number, number];

export const FIRST_ROUND: Readonly<Record<number, readonly FirstRoundEntry[]>> = {
  2: [
    [1, 1, 4, 2],
    [3, 1, 2, 2],
    [2, 1, 3, 2],
    [4, 1, 1, 2],
  ],
  4: [
    [1, 1, 4, 4],
    [2, 3, 3, 2],
    [1, 4, 4, 1],
    [2, 2, 3, 3],
    [1, 3, 4, 2],
    [2, 1, 3, 4],
    [1, 2, 4, 3],
    [2, 4, 3, 1],
  ],
  8: [
    [1, 1, 4, 8],
    [2, 5, 3, 4],
    [1, 8, 4, 1],
    [2, 2, 3, 7],
    [1, 5, 4, 4],
    [2, 1, 3, 8],
    [1, 4, 4, 5],
    [2, 6, 3, 3],
    [1, 3, 4, 6],
    [2, 7, 3, 2],
    [1, 6, 4, 3],
    [2, 4, 3, 5],
    [1, 7, 4, 2],
    [2, 3, 3, 6],
    [1, 2, 4, 7],
    [2, 8, 3, 1],
  ],
};

export function firstRound(groupCount: number): readonly FirstRoundEntry[] {
  const entries = FIRST_ROUND[groupCount];
  if (!entries) throw new RangeError(`Kein Baum für ${String(groupCount)} Gruppen.`);
  return entries;
}

/**
 * Reihenfolge der Gruppensieger im Hauptfeld (0-basierte Gruppenindizes).
 * 4 Gruppen: G1, G4, G3, G2; 8 Gruppen: G1, G8, G5, G4, G3, G6, G7, G2 (Q48).
 */
export function winnersOrder(groupCount: number): number[] {
  return firstRound(groupCount).flatMap(([rankA, groupA, rankB, groupB]) =>
    rankA === 1 ? [groupA - 1] : rankB === 1 ? [groupB - 1] : [],
  );
}

/** Reihenfolge der Plätze „4.Gx“ im Baum (0-basierte Gruppenindizes). */
export function fourthsOrder(groupCount: number): number[] {
  return firstRound(groupCount).flatMap(([rankA, groupA, rankB, groupB]) =>
    rankA === 4 ? [groupA - 1] : rankB === 4 ? [groupB - 1] : [],
  );
}
