import type { SetFormat, TeamId } from '../model/types';
import { type CompletedMatch, type Tally, rankingKey, splitByKey, tally } from './tally';

/**
 * Gruppentabelle (Q6, Q7, Q28, Q46; README.md „Tabellenwertung“).
 *
 * 1. Punkte  2. Satzdifferenz  3. Ballpunktdifferenz
 * 4. Direkter Vergleich als Mini-Tabelle der gleichstehenden Teams; trennt sie nur teilweise,
 *    wird er auf die verbleibenden gleichstehenden Teams erneut angewendet (Q46).
 * 5. Schere-Stein-Papier: Die Turnierleitung trägt die Reihenfolge ein.
 *
 * Zurückgezogene Teams werden mit allen ihren Spielen aus der Wertung genommen (Q28).
 */

export interface StandingsInput {
  /** Teams der Gruppe nach Setzung. */
  readonly teamIds: readonly TeamId[];
  readonly matches: readonly CompletedMatch[];
  readonly setFormat: SetFormat;
  readonly withdrawn?: ReadonlySet<TeamId>;
  /** Eingetragene Reihenfolgen aus Schere-Stein-Papier, je eine pro Gleichstand. */
  readonly rockPaperScissors?: readonly (readonly TeamId[])[];
}

export interface StandingRow extends Tally {
  /** Gleichstände ohne Entscheidung teilen sich den besten Rang. */
  readonly rank: number;
}

export interface GroupStandings {
  readonly rows: readonly StandingRow[];
  /** Gleichstände, für die Schere-Stein-Papier nötig ist (nur bei beendeter Gruppe). */
  readonly pendingRockPaperScissors: readonly (readonly TeamId[])[];
  /** Alle Spiele der verbleibenden Teams sind gespielt. */
  readonly isComplete: boolean;
  /** Gruppe beendet und alle Plätze eindeutig. */
  readonly isFinal: boolean;
  readonly withdrawn: readonly TeamId[];
}

export function computeGroupStandings(input: StandingsInput): GroupStandings {
  const withdrawnSet = input.withdrawn ?? new Set<TeamId>();
  const active = input.teamIds.filter((id) => !withdrawnSet.has(id));
  const matches = input.matches.filter(
    (m) => !withdrawnSet.has(m.teamA) && !withdrawnSet.has(m.teamB),
  );
  const decisions = input.rockPaperScissors ?? [];
  const totals = tally(active, matches, input.setFormat);
  const tallyOf = (id: TeamId): Tally => {
    const t = totals.get(id);
    if (!t) throw new Error(`Team ${id} fehlt in der Tabelle`);
    return t;
  };

  const blocks = splitByKey(active, (id) => rankingKey(tallyOf(id))).flatMap((block) =>
    block.length === 1 ? [block] : resolveTie(block, matches, input.setFormat, decisions),
  );

  const rows: StandingRow[] = [];
  for (const block of blocks) {
    const rank = rows.length + 1;
    const ordered = block.length > 1 ? bySeed(block, input.teamIds) : block;
    for (const id of ordered) rows.push({ ...tallyOf(id), rank });
  }

  const expectedMatches = (active.length * (active.length - 1)) / 2;
  const playedMatches = new Set(matches.map((m) => pairKey(m.teamA, m.teamB))).size;
  const isComplete = playedMatches >= expectedMatches;
  const ties = blocks.filter((block) => block.length > 1);
  const pendingRockPaperScissors = isComplete ? ties.map((t) => bySeed(t, input.teamIds)) : [];

  return {
    rows,
    pendingRockPaperScissors,
    isComplete,
    isFinal: isComplete && ties.length === 0,
    withdrawn: input.teamIds.filter((id) => withdrawnSet.has(id)),
  };
}

/** Direkter Vergleich, rekursiv auf Restgleichstände (Q7, Q46), zuletzt Schere-Stein-Papier. */
function resolveTie(
  block: readonly TeamId[],
  matches: readonly CompletedMatch[],
  setFormat: SetFormat,
  decisions: readonly (readonly TeamId[])[],
): TeamId[][] {
  const mini = tally(block, matches, setFormat);
  const subBlocks = splitByKey(block, (id) => {
    const t = mini.get(id);
    return t ? rankingKey(t) : [0, 0, 0];
  });

  if (subBlocks.length === 1) {
    const decision = decisions.find((order) => isPermutationOf(order, block));
    return decision ? decision.map((id) => [id]) : [[...block]];
  }
  return subBlocks.flatMap((sub) =>
    sub.length === 1 ? [sub] : resolveTie(sub, matches, setFormat, decisions),
  );
}

function isPermutationOf(order: readonly TeamId[], block: readonly TeamId[]): boolean {
  return order.length === block.length && block.every((id) => order.includes(id));
}

function bySeed(block: readonly TeamId[], seedOrder: readonly TeamId[]): TeamId[] {
  return [...block].sort((x, y) => seedOrder.indexOf(x) - seedOrder.indexOf(y));
}

function pairKey(x: TeamId, y: TeamId): string {
  return x < y ? `${x}|${y}` : `${y}|${x}`;
}
