import { describe, it, expect } from 'vitest';
import {
  generateSnakeDraftGroups,
  calculateGroupStandings,
  getTeamsByGroupRank,
  validateGroupConfig,
  getGroupPhaseMatchCount,
} from '../groupPhase';
import { createTeams } from '../../__tests__/utils/testHelpers';
import type { Group, GroupPhaseConfig, Match } from '../../types/tournament';

describe('calculateGroupStandings', () => {
  it('calculates correct standings after all matches', () => {
    const teams = createTeams(4);
    const group: Group = { id: 'group-1', name: 'Gruppe A', teamIds: teams.map(t => t.id) };

    const matches: Match[] = [
      { id: '1', round: 1, matchNumber: 1, teamAId: teams[0].id, teamBId: teams[1].id, courtNumber: 1, scores: [{ teamA: 21, teamB: 15 }], winnerId: teams[0].id, status: 'completed', groupId: group.id },
      { id: '2', round: 1, matchNumber: 2, teamAId: teams[2].id, teamBId: teams[3].id, courtNumber: 2, scores: [{ teamA: 21, teamB: 18 }], winnerId: teams[2].id, status: 'completed', groupId: group.id },
      { id: '3', round: 2, matchNumber: 3, teamAId: teams[0].id, teamBId: teams[2].id, courtNumber: 1, scores: [{ teamA: 21, teamB: 19 }], winnerId: teams[0].id, status: 'completed', groupId: group.id },
      { id: '4', round: 2, matchNumber: 4, teamAId: teams[1].id, teamBId: teams[3].id, courtNumber: 2, scores: [{ teamA: 21, teamB: 12 }], winnerId: teams[1].id, status: 'completed', groupId: group.id },
      { id: '5', round: 3, matchNumber: 5, teamAId: teams[0].id, teamBId: teams[3].id, courtNumber: 1, scores: [{ teamA: 21, teamB: 10 }], winnerId: teams[0].id, status: 'completed', groupId: group.id },
      { id: '6', round: 3, matchNumber: 6, teamAId: teams[1].id, teamBId: teams[2].id, courtNumber: 2, scores: [{ teamA: 15, teamB: 21 }], winnerId: teams[2].id, status: 'completed', groupId: group.id },
    ];

    const standings = calculateGroupStandings(group.id, teams, matches, 1, 'head-to-head-first');

    // Team 0: 3 wins - 1st, Team 2: 2 wins - 2nd, Team 1: 1 win - 3rd, Team 3: 0 wins - 4th
    expect(standings[0].teamId).toBe(teams[0].id);
    expect(standings[0].won).toBe(3);
    expect(standings[0].groupRank).toBe(1);

    expect(standings[1].teamId).toBe(teams[2].id);
    expect(standings[1].won).toBe(2);
    expect(standings[1].groupRank).toBe(2);

    expect(standings[2].teamId).toBe(teams[1].id);
    expect(standings[2].won).toBe(1);
    expect(standings[2].groupRank).toBe(3);

    expect(standings[3].teamId).toBe(teams[3].id);
    expect(standings[3].won).toBe(0);
    expect(standings[3].groupRank).toBe(4);
  });
});

describe('getTeamsByGroupRank', () => {
  it('returns all teams with specified rank', () => {
    const teams = createTeams(16);
    const config: GroupPhaseConfig = {
      numberOfGroups: 4,
      teamsPerGroup: 4,
      seeding: 'snake',
      groups: generateSnakeDraftGroups(teams, 4),
    };

    const standings = config.groups.flatMap((group) =>
      group.teamIds.map((teamId, index) => ({
        teamId, played: 3, won: 3 - index, lost: index, setsWon: 3 - index, setsLost: index,
        pointsWon: 63 - index * 10, pointsLost: 45 + index * 5, points: 3 - index,
        groupId: group.id, groupRank: index + 1,
      }))
    );

    const firstPlaceTeams = getTeamsByGroupRank(standings, 1);
    expect(firstPlaceTeams).toHaveLength(4);
    expect(firstPlaceTeams.every(t => t.groupRank === 1)).toBe(true);

    const fourthPlaceTeams = getTeamsByGroupRank(standings, 4);
    expect(fourthPlaceTeams).toHaveLength(4);
    expect(fourthPlaceTeams.every(t => t.groupRank === 4)).toBe(true);
  });
});

describe('validateGroupConfig', () => {
  it('validates correct configuration', () => {
    const teams = createTeams(16);
    expect(validateGroupConfig(teams, 4, 4).valid).toBe(true);
  });

  it('rejects too few teams', () => {
    const teams = createTeams(3);
    expect(validateGroupConfig(teams, 4, 4).valid).toBe(false);
  });

  it('rejects too many teams', () => {
    const teams = createTeams(20);
    expect(validateGroupConfig(teams, 4, 4).valid).toBe(false);
  });

  it('rejects uneven distribution', () => {
    const teams = createTeams(13);
    expect(validateGroupConfig(teams, 4, 4).valid).toBe(false);
  });
});

describe('getGroupPhaseMatchCount', () => {
  it.each([
    [4, 4, 24], [3, 4, 18], [2, 4, 12], [6, 4, 36],
  ])('calculates correct count for %i groups of %i teams (%i matches)', (groups, teamsPerGroup, expected) => {
    expect(getGroupPhaseMatchCount(groups, teamsPerGroup)).toBe(expected);
  });
});
