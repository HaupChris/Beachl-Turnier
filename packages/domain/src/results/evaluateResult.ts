import type { SetFormat, SetScore } from '../model/types';

/** Zusammenfassung eines gültigen Ergebnisses aus Sicht von Team A und B. */
export interface ResultSummary {
  readonly setsA: number;
  readonly setsB: number;
  readonly pointsA: number;
  readonly pointsB: number;
  /** `null` nur bei „2 Sätze“ mit 1:1. */
  readonly winner: 'a' | 'b' | null;
}

export type ResultEvaluation =
  | { readonly ok: true; readonly summary: ResultSummary }
  | { readonly ok: false; readonly error: string };

/** Ein dritter Satz geht immer bis 15 (README.md „Satzmodus“). */
const DECIDING_SET_POINTS = 15;

/**
 * Prüft ein Ergebnis gegen den Satzmodus und fasst es zusammen.
 *
 * Regeln (Q22–Q24, Q33):
 * - Satz bis 21 oder 15, mit 2 Punkten Vorsprung, ohne Obergrenze.
 * - „1 Satz“: genau ein Satz. „2 Sätze“: genau zwei Sätze, 1:1 möglich.
 * - „2 Gewinnsätze“: endet, sobald ein Team zwei Sätze hat; dritter Satz bis 15.
 */
export function evaluateResult(format: SetFormat, sets: readonly SetScore[]): ResultEvaluation {
  const expected = expectedSetCount(format, sets);
  if (typeof expected === 'string') return fail(expected);

  let setsA = 0;
  let setsB = 0;
  let pointsA = 0;
  let pointsB = 0;
  for (const [index, set] of sets.entries()) {
    const target = index === 2 ? DECIDING_SET_POINTS : format.pointsPerSet;
    const error = validateSet(set, target);
    if (error) return fail(`Satz ${String(index + 1)}: ${error}`);
    if (set.a > set.b) setsA++;
    else setsB++;
    pointsA += set.a;
    pointsB += set.b;
  }

  if (format.kind === 'bestOfThree') {
    const error = validateBestOfThreeProgress(sets);
    if (error) return fail(error);
  }

  const winner = setsA > setsB ? 'a' : setsB > setsA ? 'b' : null;
  return { ok: true, summary: { setsA, setsB, pointsA, pointsB, winner } };
}

function expectedSetCount(format: SetFormat, sets: readonly SetScore[]): string | undefined {
  const count = sets.length;
  switch (format.kind) {
    case 'singleSet':
      return count === 1 ? undefined : 'Bei „1 Satz“ muss genau ein Satz eingetragen sein.';
    case 'twoSets':
      return count === 2 ? undefined : 'Bei „2 Sätze“ müssen genau zwei Sätze eingetragen sein.';
    case 'bestOfThree':
      return count === 2 || count === 3
        ? undefined
        : 'Bei „2 Gewinnsätze“ müssen zwei oder drei Sätze eingetragen sein.';
  }
}

function validateSet(set: SetScore, target: number): string | undefined {
  if (![set.a, set.b].every((p) => Number.isInteger(p) && p >= 0)) {
    return 'Punkte müssen ganze Zahlen ab 0 sein.';
  }
  const high = Math.max(set.a, set.b);
  const diff = Math.abs(set.a - set.b);
  if (high < target) return `Ein Team muss mindestens ${String(target)} Punkte haben.`;
  if (diff < 2) return 'Ein Satz ist erst mit 2 Punkten Vorsprung gewonnen.';
  if (high > target && diff !== 2) {
    return `Über ${String(target)} Punkte endet ein Satz genau mit 2 Punkten Vorsprung.`;
  }
  return undefined;
}

function validateBestOfThreeProgress(sets: readonly SetScore[]): string | undefined {
  const [first, second] = sets;
  if (!first || !second) return undefined;
  const sameWinner = first.a > first.b === second.a > second.b;
  if (sameWinner && sets.length === 3) {
    return 'Nach 2:0 Sätzen ist das Spiel beendet, ein dritter Satz ist nicht möglich.';
  }
  if (!sameWinner && sets.length === 2) {
    return 'Bei 1:1 Sätzen fehlt der dritte Satz.';
  }
  return undefined;
}

function fail(error: string): ResultEvaluation {
  return { ok: false, error };
}
