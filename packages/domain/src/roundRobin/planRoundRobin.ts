import type { MatchId, Team, TeamId } from '../model/types';
import { roundRobinRounds } from './roundRobinSchedule';

/** Q29: 3–8 Teams; darüber nur eine Warnung wegen der Dauer, keine Sperre. */
export const MIN_ROUND_ROBIN_TEAMS = 3;
export const RECOMMENDED_MAX_ROUND_ROBIN_TEAMS = 8;

export interface RoundRobinMatch {
  /** Zum Beispiel „R2-3“ = drittes Spiel der zweiten Runde. */
  readonly id: MatchId;
  readonly round: number;
  readonly teamA: TeamId;
  readonly teamB: TeamId;
}

/** Platzierungsspiel zwischen zwei Tabellenrängen, z. B. 3–4 um Platz 3 (Q29). */
export interface PlacementMatchPlan {
  readonly id: MatchId;
  /** Der bessere der beiden Ränge = der Platz, um den gespielt wird. */
  readonly upperRank: number;
  readonly lowerRank: number;
}

export interface RoundRobinPlan {
  readonly matches: readonly RoundRobinMatch[];
  readonly placementMatches: readonly PlacementMatchPlan[];
  readonly warnings: readonly 'manyTeams'[];
}

export interface RoundRobinOptions {
  /** Schalter „Platzierungsspiele“ (Q29). */
  readonly withPlacementMatches: boolean;
}

export function planRoundRobin(teams: readonly Team[], options: RoundRobinOptions): RoundRobinPlan {
  if (teams.length < MIN_ROUND_ROBIN_TEAMS) {
    throw new RangeError(
      `Jeder gegen jeden braucht mindestens ${String(MIN_ROUND_ROBIN_TEAMS)} Teams.`,
    );
  }
  const bySeed = new Map(teams.map((t) => [t.seed, t.id]));
  if (bySeed.size !== teams.length || teams.some((t) => t.seed < 1 || t.seed > teams.length)) {
    throw new RangeError('Setzplätze müssen lückenlos von 1 bis N vergeben sein.');
  }
  const idOf = (seed: number): TeamId => {
    const id = bySeed.get(seed);
    if (id === undefined) throw new RangeError(`Setzplatz ${String(seed)} fehlt.`);
    return id;
  };

  const matches = roundRobinRounds(teams.length).flatMap((pairs, roundIndex) =>
    pairs.map(([a, b], i) => ({
      id: `R${String(roundIndex + 1)}-${String(i + 1)}`,
      round: roundIndex + 1,
      teamA: idOf(a),
      teamB: idOf(b),
    })),
  );

  const placementMatches: PlacementMatchPlan[] = [];
  if (options.withPlacementMatches) {
    // 1–2, 3–4, …; bei ungerader Teamzahl hat der Letzte kein Spiel.
    for (let upper = 1; upper + 1 <= teams.length; upper += 2) {
      placementMatches.push({ id: `P${String(upper)}`, upperRank: upper, lowerRank: upper + 1 });
    }
  }

  const warnings = teams.length > RECOMMENDED_MAX_ROUND_ROBIN_TEAMS ? (['manyTeams'] as const) : [];
  return { matches, placementMatches, warnings };
}

/**
 * Endplatzierung: Das Ergebnis eines Platzierungsspiels entscheidet den Platz,
 * nicht die Tabelle (Q29). Ohne Platzierungsspiele ist die Tabelle der Endstand.
 *
 * @param tableOrder Teams in endgültiger Tabellenreihenfolge (Rang 1 zuerst)
 * @param placementWinners Platzierungsspiel-ID → Sieger; fehlt ein Eintrag, ist das Spiel offen
 * @returns Teams in Reihenfolge der Endplatzierung, oder `undefined`, solange Spiele offen sind
 */
export function roundRobinFinalOrder(
  tableOrder: readonly TeamId[],
  placementMatches: readonly PlacementMatchPlan[],
  placementWinners: ReadonlyMap<MatchId, TeamId>,
): TeamId[] | undefined {
  const order = [...tableOrder];
  for (const match of placementMatches) {
    const upper = order[match.upperRank - 1];
    const lower = order[match.lowerRank - 1];
    const winner = placementWinners.get(match.id);
    if (winner === undefined || upper === undefined || lower === undefined) return undefined;
    if (winner !== upper && winner !== lower) {
      throw new RangeError(`Sieger ${winner} spielt nicht in ${match.id}.`);
    }
    if (winner === lower) {
      order[match.upperRank - 1] = lower;
      order[match.lowerRank - 1] = upper;
    }
  }
  return order;
}
