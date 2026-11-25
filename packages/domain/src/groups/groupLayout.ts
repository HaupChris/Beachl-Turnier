import { snakePosition } from './snake';

/**
 * Gruppenaufteilung nach Teamzahl (Q3, Q4c, Q18; group-phase.md).
 *
 * - Nur 2, 4 oder 8 Gruppen; Gruppengröße 3–5; Größen unterscheiden sich höchstens um 1.
 * - 2er-Gruppen nur, wenn keine andere Aufteilung existiert (11 und 21–23 Teams).
 * - Für jede Teamzahl gibt es genau eine gültige Aufteilung: die kleinste passende Gruppenzahl.
 */

export const MIN_GROUP_PHASE_TEAMS = 6;
export const MAX_GROUP_PHASE_TEAMS = 32;

const GROUP_COUNTS = [2, 4, 8] as const;
export type GroupCount = (typeof GROUP_COUNTS)[number];

export interface GroupLayout {
  readonly groupCount: GroupCount;
  /** Größte Gruppengröße (Plätze pro Gruppe in der Schlange). */
  readonly capacity: number;
  /** Teams je Gruppe, Index 0 = G1. */
  readonly sizes: readonly number[];
  /** Ausnahme mit 2er-Gruppen (Q4c). */
  readonly hasTwoTeamGroups: boolean;
}

export function planGroupLayout(teamCount: number): GroupLayout {
  if (
    !Number.isInteger(teamCount) ||
    teamCount < MIN_GROUP_PHASE_TEAMS ||
    teamCount > MAX_GROUP_PHASE_TEAMS
  ) {
    throw new RangeError(
      `Gruppenphase nur mit ${String(MIN_GROUP_PHASE_TEAMS)}–${String(MAX_GROUP_PHASE_TEAMS)} Teams möglich, nicht mit ${String(teamCount)}.`,
    );
  }
  const candidates = GROUP_COUNTS.map((groupCount) => layoutFor(teamCount, groupCount)).filter(
    (layout) => layout.capacity >= 3 && layout.capacity <= 5,
  );
  const regular = candidates.find((layout) => Math.min(...layout.sizes) >= 3);
  const exception = candidates.find((layout) => Math.min(...layout.sizes) >= 2);
  const chosen = regular ?? exception;
  if (!chosen) {
    throw new RangeError(`Keine gültige Gruppenaufteilung für ${String(teamCount)} Teams.`);
  }
  return chosen;
}

function layoutFor(teamCount: number, groupCount: GroupCount): GroupLayout {
  const sizes = Array.from({ length: groupCount }, () => 0);
  for (let seed = 1; seed <= teamCount; seed++) {
    const { groupIndex } = snakePosition(seed, groupCount);
    sizes[groupIndex] = (sizes[groupIndex] ?? 0) + 1;
  }
  const capacity = Math.ceil(teamCount / groupCount);
  return { groupCount, capacity, sizes, hasTwoTeamGroups: Math.min(...sizes) === 2 };
}
