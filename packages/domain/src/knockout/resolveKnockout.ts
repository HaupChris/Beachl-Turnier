import type { MatchId, TeamId } from '../model/types';
import type { KnockoutMatch, KnockoutPlan, SlotSource } from './types';

export interface KnockoutState {
  /** Team auf Gruppenplatz `rank` in Gruppe `groupIndex`, sobald die Gruppe endgültig ist. */
  readonly groupRanking: (groupIndex: number, rank: number) => TeamId | undefined;
  /** Eingetragene Sieger je Spiel. */
  readonly winners: ReadonlyMap<MatchId, TeamId>;
  /** Im K.o. zurückgezogene Teams (Q28). */
  readonly withdrawn?: ReadonlySet<TeamId>;
}

export interface ResolvedMatch {
  readonly match: KnockoutMatch;
  readonly teamA: TeamId | undefined;
  readonly teamB: TeamId | undefined;
  readonly winner: TeamId | undefined;
  readonly loser: TeamId | undefined;
  /** Kampflos entschieden, weil ein Team zurückgezogen hat (Q28). */
  readonly walkover: boolean;
}

export interface KnockoutResolution {
  readonly matches: readonly ResolvedMatch[];
  /** Feststehende Plätze; geteilte Plätze erscheinen mehrfach (Q11). */
  readonly placements: readonly { readonly place: number; readonly teamId: TeamId }[];
  /** Alle Plätze stehen fest. */
  readonly isComplete: boolean;
}

/**
 * Setzt Gruppenergebnisse, K.o.-Ergebnisse und Rückzüge in den Plan ein.
 *
 * Rückzug im K.o. (Q28): Das nächste offene Spiel des Teams endet als Walkover für den Gegner;
 * danach verliert es jedes weitere Spiel kampflos und landet so auf dem schlechtesten Platz
 * des Teilbaums. Treffen zwei zurückgezogene Teams aufeinander, kommt Team A weiter.
 */
export function resolveKnockout(plan: KnockoutPlan, state: KnockoutState): KnockoutResolution {
  const withdrawn = state.withdrawn ?? new Set<TeamId>();
  const byId = new Map(plan.matches.map((m) => [m.id, m]));
  const resolved = new Map<MatchId, ResolvedMatch>();

  const teamFor = (source: SlotSource): TeamId | undefined => {
    if (source.kind === 'groupRank') return state.groupRanking(source.groupIndex, source.rank);
    const result = resolveMatch(source.matchId);
    return source.kind === 'winnerOf' ? result?.winner : result?.loser;
  };

  function resolveMatch(id: MatchId): ResolvedMatch | undefined {
    const cached = resolved.get(id);
    if (cached) return cached;
    const match = byId.get(id);
    if (!match) return undefined;
    const teamA = teamFor(match.slotA);
    const teamB = teamFor(match.slotB);
    let winner: TeamId | undefined;
    let walkover = false;
    if (teamA !== undefined && teamB !== undefined) {
      const entered = state.winners.get(id);
      if (entered === teamA || entered === teamB) {
        winner = entered;
      } else if (withdrawn.has(teamA) || withdrawn.has(teamB)) {
        winner = withdrawn.has(teamA) && !withdrawn.has(teamB) ? teamB : teamA;
        walkover = true;
      }
    }
    const loser = winner === undefined ? undefined : winner === teamA ? teamB : teamA;
    const result = { match, teamA, teamB, winner, loser, walkover };
    resolved.set(id, result);
    return result;
  }

  const matches = plan.matches.map((m) => resolveMatch(m.id)).filter((m) => m !== undefined);
  const placements = plan.placements.flatMap((entry) => {
    const teamId = teamFor(entry.source);
    return teamId === undefined ? [] : [{ place: entry.place, teamId }];
  });
  return { matches, placements, isComplete: placements.length === plan.placements.length };
}
