/**
 * Rundenplan „Jeder gegen jeden“ als Paare von Setzplätzen (Q29; round-robin.md).
 *
 * - 6 und 8 Teams: Reihenfolge der Vereinspläne, Paare je Runde in Feld-Reihenfolge.
 * - Andere Teamzahlen: Kreisverfahren. Jedes Team spielt pro Runde höchstens einmal;
 *   bei ungerader Teamzahl hat in jeder Runde ein Team spielfrei.
 */

export type SeedPair = readonly [number, number];

const PLAN_ROUNDS: Readonly<Record<number, readonly (readonly SeedPair[])[]>> = {
  6: [
    [
      [2, 5],
      [1, 6],
      [3, 4],
    ],
    [
      [1, 5],
      [2, 4],
      [3, 6],
    ],
    [
      [1, 4],
      [2, 3],
      [5, 6],
    ],
    [
      [1, 3],
      [2, 6],
      [4, 5],
    ],
    [
      [1, 2],
      [3, 5],
      [4, 6],
    ],
  ],
  8: [
    [
      [1, 8],
      [2, 7],
      [3, 6],
      [4, 5],
    ],
    [
      [7, 8],
      [1, 6],
      [2, 5],
      [3, 4],
    ],
    [
      [5, 6],
      [4, 7],
      [3, 8],
      [1, 2],
    ],
    [
      [4, 6],
      [1, 3],
      [5, 7],
      [2, 8],
    ],
    [
      [2, 4],
      [3, 5],
      [1, 7],
      [6, 8],
    ],
    [
      [2, 3],
      [5, 8],
      [1, 4],
      [6, 7],
    ],
    [
      [3, 7],
      [2, 6],
      [4, 8],
      [1, 5],
    ],
  ],
};

export function roundRobinRounds(teamCount: number): readonly (readonly SeedPair[])[] {
  if (!Number.isInteger(teamCount) || teamCount < 2) {
    throw new RangeError(
      `Jeder gegen jeden braucht mindestens 2 Teams, nicht ${String(teamCount)}.`,
    );
  }
  return PLAN_ROUNDS[teamCount] ?? circleMethod(teamCount);
}

/** Kreisverfahren: Seed 1 bleibt stehen, die übrigen rotieren. 0 = spielfrei. */
function circleMethod(teamCount: number): SeedPair[][] {
  const slots = Array.from({ length: teamCount + (teamCount % 2) }, (_, i) =>
    i < teamCount ? i + 1 : 0,
  );
  const half = slots.length / 2;
  const rounds: SeedPair[][] = [];
  for (let round = 0; round < slots.length - 1; round++) {
    const pairs: SeedPair[] = [];
    for (let i = 0; i < half; i++) {
      const x = slots[i] ?? 0;
      const y = slots[slots.length - 1 - i] ?? 0;
      if (x !== 0 && y !== 0) pairs.push(x < y ? [x, y] : [y, x]);
    }
    rounds.push(pairs);
    const last = slots.pop();
    if (last !== undefined) slots.splice(1, 0, last);
  }
  return rounds;
}
