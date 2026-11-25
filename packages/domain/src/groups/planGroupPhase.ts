import type { MatchId, Team, TeamId } from '../model/types';
import { type GroupLayout, planGroupLayout } from './groupLayout';
import { groupMatchOrder } from './groupMatchOrder';
import { groupName, snakePosition } from './snake';

export interface Group {
  /** 0-basiert: 0 = G1. */
  readonly index: number;
  readonly name: string;
  /** Teams nach Platz in der Gruppe (Setzung), Index 0 = Position 1. */
  readonly teamIds: readonly TeamId[];
}

export type RefereeAssignment =
  | { readonly kind: 'team'; readonly teamId: TeamId }
  | { readonly kind: 'loserOf'; readonly matchId: MatchId }
  | { readonly kind: 'none' };

export interface GroupMatch {
  /** Zum Beispiel „A-3“ = drittes Spiel in Gruppe A. */
  readonly id: MatchId;
  readonly groupIndex: number;
  /** 1-basiert, Reihenfolge innerhalb der Gruppe. */
  readonly order: number;
  readonly teamA: TeamId;
  readonly teamB: TeamId;
  readonly referee: RefereeAssignment;
}

export interface GroupPhasePlan {
  readonly layout: GroupLayout;
  readonly groups: readonly Group[];
  readonly matches: readonly GroupMatch[];
}

/** Erzeugt Gruppen und Gruppenspiele aus der Setzliste (group-phase.md). */
export function planGroupPhase(teams: readonly Team[]): GroupPhasePlan {
  assertValidSeeding(teams);
  const layout = planGroupLayout(teams.length);

  const members: TeamId[][] = Array.from({ length: layout.groupCount }, () => []);
  for (const team of [...teams].sort((x, y) => x.seed - y.seed)) {
    const { groupIndex } = snakePosition(team.seed, layout.groupCount);
    members[groupIndex]?.push(team.id);
  }

  const groups = members.map((teamIds, index) => ({ index, name: groupName(index), teamIds }));
  const matches = groups.flatMap(planMatchesForGroup);
  return { layout, groups, matches };
}

function planMatchesForGroup(group: Group): GroupMatch[] {
  const matchId = (orderIndex: number): MatchId => `${group.name}-${String(orderIndex + 1)}`;
  const teamAt = (position: number): TeamId => {
    const teamId = group.teamIds[position - 1];
    if (teamId === undefined)
      throw new Error(`Position ${String(position)} fehlt in ${group.name}`);
    return teamId;
  };

  return groupMatchOrder(group.teamIds.length).map((template, orderIndex) => {
    const referee: RefereeAssignment =
      template.referee.kind === 'position'
        ? { kind: 'team', teamId: teamAt(template.referee.position) }
        : template.referee.kind === 'loserOf'
          ? { kind: 'loserOf', matchId: matchId(template.referee.orderIndex) }
          : { kind: 'none' };
    return {
      id: matchId(orderIndex),
      groupIndex: group.index,
      order: orderIndex + 1,
      teamA: teamAt(template.positionA),
      teamB: teamAt(template.positionB),
      referee,
    };
  });
}

function assertValidSeeding(teams: readonly Team[]): void {
  const seeds = teams.map((t) => t.seed).sort((x, y) => x - y);
  const valid = seeds.every((seed, index) => seed === index + 1);
  if (!valid) throw new RangeError('Setzplätze müssen lückenlos von 1 bis N vergeben sein.');
  if (new Set(teams.map((t) => t.id)).size !== teams.length) {
    throw new RangeError('Team-IDs müssen eindeutig sein.');
  }
}
