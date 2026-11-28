import {
  type KnockoutPlan,
  type KnockoutState,
  planFullPlacement,
  planGroupPhase,
  planSplitBracket,
  resolveKnockout,
  type TeamId,
} from '../../src';
import { makeTeams } from '../helpers';

export type Format = 'full' | 'split';

export function planFor(format: Format, teamCount: number) {
  const groupPhase = planGroupPhase(makeTeams(teamCount));
  const input = { groupSizes: groupPhase.groups.map((g) => g.teamIds.length) };
  const plan = format === 'full' ? planFullPlacement(input) : planSplitBracket(input);
  return { groupPhase, plan };
}

export const seedOf = (id: TeamId) => Number(id.slice(1));

/** Gruppenplätze nach Setzung (jede Gruppe endet wie gesetzt). */
export function chalkGroupRanking(groupPhase: ReturnType<typeof planGroupPhase>) {
  return (groupIndex: number, rank: number) => groupPhase.groups[groupIndex]?.teamIds[rank - 1];
}

/**
 * Spielt den K.o.-Teil durch: `pickWinner` entscheidet jedes Spiel.
 * Wiederholt die Auflösung, bis alle Spiele mit zwei Teams ein Ergebnis haben.
 */
export function playOut(
  plan: KnockoutPlan,
  groupRanking: KnockoutState['groupRanking'],
  pickWinner: (a: TeamId, b: TeamId, matchId: string) => TeamId,
  withdrawn: ReadonlySet<TeamId> = new Set(),
) {
  const winners = new Map<string, TeamId>();
  for (let guard = 0; guard <= plan.matches.length; guard++) {
    const state = { groupRanking, winners, withdrawn };
    const resolution = resolveKnockout(plan, state);
    const open = resolution.matches.filter(
      (m) => m.teamA !== undefined && m.teamB !== undefined && m.winner === undefined,
    );
    if (open.length === 0) return resolution;
    for (const m of open) {
      if (m.teamA !== undefined && m.teamB !== undefined) {
        winners.set(m.match.id, pickWinner(m.teamA, m.teamB, m.match.id));
      }
    }
  }
  throw new Error('K.o.-Teil endet nicht');
}

export const betterSeedWins = (a: TeamId, b: TeamId) => (seedOf(a) < seedOf(b) ? a : b);
