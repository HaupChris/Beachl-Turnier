/**
 * Grundlegende Fachtypen. Begriffe: docs/glossary.md
 */

export type TeamId = string;
export type MatchId = string;

export interface Team {
  readonly id: TeamId;
  readonly name: string;
  /** Setzplatz, 1 = stärkstes Team. */
  readonly seed: number;
}

/** Satzmodus eines Bereichs (Q22–Q24, Q33; README.md „Satzmodus“). */
export type SetFormatKind = 'singleSet' | 'twoSets' | 'bestOfThree';

export interface SetFormat {
  readonly kind: SetFormatKind;
  readonly pointsPerSet: 21 | 15;
}

/** Ballpunkte eines Satzes aus Sicht von Team A und Team B. */
export interface SetScore {
  readonly a: number;
  readonly b: number;
}
