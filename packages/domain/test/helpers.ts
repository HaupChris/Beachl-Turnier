import type { SetFormat, SetScore, Team, TeamId } from '../src';
import type { CompletedMatch } from '../src';

/** Teams T1…Tn mit Setzplatz = Nummer. */
export function makeTeams(count: number): Team[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `T${String(i + 1)}`,
    name: `Team ${String(i + 1)}`,
    seed: i + 1,
  }));
}

export const SINGLE_21: SetFormat = { kind: 'singleSet', pointsPerSet: 21 };
export const TWO_SETS_15: SetFormat = { kind: 'twoSets', pointsPerSet: 15 };
export const BEST_OF_THREE_15: SetFormat = { kind: 'bestOfThree', pointsPerSet: 15 };

/** Spiel, in dem `teamA` mit den angegebenen Sätzen spielt (Sicht von A). */
export function played(teamA: TeamId, teamB: TeamId, ...sets: [number, number][]): CompletedMatch {
  return { teamA, teamB, sets: sets.map(([a, b]): SetScore => ({ a, b })) };
}
