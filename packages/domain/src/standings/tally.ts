import type { SetFormat, SetScore, TeamId } from '../model/types';

/** Ein beendetes Spiel mit gültigem Ergebnis (geprüft durch evaluateResult). */
export interface CompletedMatch {
  readonly teamA: TeamId;
  readonly teamB: TeamId;
  readonly sets: readonly SetScore[];
}

export interface Tally {
  readonly teamId: TeamId;
  readonly played: number;
  readonly won: number;
  readonly drawn: number;
  readonly lost: number;
  readonly setsWon: number;
  readonly setsLost: number;
  readonly pointsWon: number;
  readonly pointsLost: number;
  /** Tabellenpunkte: Siege, bei „2 Sätze“ die gewonnenen Sätze (README.md „Tabellenwertung“). */
  readonly points: number;
}

/** Zählt nur Spiele, an denen beide Teams aus `teamIds` beteiligt sind. */
export function tally(
  teamIds: readonly TeamId[],
  matches: readonly CompletedMatch[],
  setFormat: SetFormat,
): Map<TeamId, Tally> {
  const members = new Set(teamIds);
  const totals = new Map(teamIds.map((id) => [id, emptyTally(id)]));

  for (const match of matches) {
    if (!members.has(match.teamA) || !members.has(match.teamB)) continue;
    const setsA = match.sets.filter((s) => s.a > s.b).length;
    const setsB = match.sets.length - setsA;
    const pointsA = match.sets.reduce((sum, s) => sum + s.a, 0);
    const pointsB = match.sets.reduce((sum, s) => sum + s.b, 0);
    add(totals, match.teamA, setsA, setsB, pointsA, pointsB);
    add(totals, match.teamB, setsB, setsA, pointsB, pointsA);
  }

  const usesSetPoints = setFormat.kind === 'twoSets';
  return new Map(
    [...totals].map(([id, t]) => [id, { ...t, points: usesSetPoints ? t.setsWon : t.won }]),
  );
}

type MutableTally = { -readonly [K in keyof Tally]: Tally[K] };

function emptyTally(teamId: TeamId): MutableTally {
  return {
    teamId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    setsWon: 0,
    setsLost: 0,
    pointsWon: 0,
    pointsLost: 0,
    points: 0,
  };
}

function add(
  totals: Map<TeamId, MutableTally>,
  teamId: TeamId,
  setsFor: number,
  setsAgainst: number,
  pointsFor: number,
  pointsAgainst: number,
): void {
  const t = totals.get(teamId);
  if (!t) return;
  t.played++;
  if (setsFor > setsAgainst) t.won++;
  else if (setsFor < setsAgainst) t.lost++;
  else t.drawn++;
  t.setsWon += setsFor;
  t.setsLost += setsAgainst;
  t.pointsWon += pointsFor;
  t.pointsLost += pointsAgainst;
}

/** Vergleichsschlüssel Punkte → Satzdifferenz → Ballpunktdifferenz (Q6). */
export function rankingKey(t: Tally): readonly [number, number, number] {
  return [t.points, t.setsWon - t.setsLost, t.pointsWon - t.pointsLost];
}

/** Sortiert absteigend nach Schlüssel und fasst gleiche Schlüssel zu Blöcken zusammen. */
export function splitByKey(
  teamIds: readonly TeamId[],
  keyOf: (id: TeamId) => readonly number[],
): TeamId[][] {
  const compare = (x: TeamId, y: TeamId): number => {
    const kx = keyOf(x);
    const ky = keyOf(y);
    for (let i = 0; i < kx.length; i++) {
      const diff = (ky[i] ?? 0) - (kx[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  };
  const sorted = [...teamIds].sort(compare);
  const blocks: TeamId[][] = [];
  for (const id of sorted) {
    const last = blocks.at(-1);
    const head = last?.[0];
    if (last && head !== undefined && compare(head, id) === 0) last.push(id);
    else blocks.push([id]);
  }
  return blocks;
}
