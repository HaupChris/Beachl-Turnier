/**
 * Schlangenverteilung nach Gruppenstärke (Q5, Q19; group-phase.md „Setzung“).
 *
 * G1 ist die Gruppe mit Seed 1. Reihe 1 läuft G1→Gn, Reihe 2 Gn→G1 usw.
 * Fehlende Teams belegen immer die schwächsten Setzplätze (Q5a).
 */

const GROUP_LETTERS = 'ABCDEFGH';

export interface SnakePosition {
  /** 0-basiert: 0 = G1. */
  readonly groupIndex: number;
  /** Platz in der Gruppe nach Setzung, 1-basiert. */
  readonly position: number;
}

export function snakePosition(seed: number, groupCount: number): SnakePosition {
  if (!Number.isInteger(seed) || seed < 1) {
    throw new RangeError(`Ungültiger Setzplatz: ${String(seed)}`);
  }
  const row = Math.floor((seed - 1) / groupCount);
  const column = (seed - 1) % groupCount;
  const groupIndex = row % 2 === 0 ? column : groupCount - 1 - column;
  return { groupIndex, position: row + 1 };
}

/** Gruppen werden nach Stärke benannt: A = G1, B = G2, … (Q19). */
export function groupName(groupIndex: number): string {
  const letter = GROUP_LETTERS[groupIndex];
  if (letter === undefined) throw new RangeError(`Ungültiger Gruppenindex: ${String(groupIndex)}`);
  return letter;
}
