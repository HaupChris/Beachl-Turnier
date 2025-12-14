import { describe, it, expect } from 'vitest';
import {
  generateSnakeDraftGroups,
  generateRandomGroups,
  generateGroups,
  generateGroupPhaseMatches,
  calculateGroupStandings,
  getTeamsByGroupRank,
  validateGroupConfig,
  getGroupPhaseMatchCount,
} from '../groupPhase';
import {
  createTeams,
  expectedGroupPhaseMatchCount,
  verifyNoSelfMatches,
  verifyNoDuplicateMatchups,
  verifyAllTeamsParticipate,
} from '../../__tests__/utils/testHelpers';
import type { Group, GroupPhaseConfig, Match } from '../../types/tournament';

describe('generateSnakeDraftGroups', () => {
  describe('team distribution', () => {
    it('distributes 16 teams into 4 groups correctly', () => {
      const teams = createTeams(16);
      const groups = generateSnakeDraftGroups(teams, 4);

      expect(groups).toHaveLength(4);
      expect(groups[0].teamIds).toHaveLength(4);
      expect(groups[1].teamIds).toHaveLength(4);
      expect(groups[2].teamIds).toHaveLength(4);
      expect(groups[3].teamIds).toHaveLength(4);
    });

    it('follows snake draft pattern for 16 teams', () => {
      const teams = createTeams(16);
      const groups = generateSnakeDraftGroups(teams, 4);

      // Group A should have seeds 1, 8, 9, 16
      const groupASeeds = groups[0].teamIds.map(id => {
        const team = teams.find(t => t.id === id);
        return team?.seedPosition;
      });
      expect(groupASeeds).toEqual([1, 8, 9, 16]);

      // Group B should have seeds 2, 7, 10, 15
      const groupBSeeds = groups[1].teamIds.map(id => {
        const team = teams.find(t => t.id === id);
        return team?.seedPosition;
      });
      expect(groupBSeeds).toEqual([2, 7, 10, 15]);
    });

    it('distributes 12 teams into 3 groups correctly', () => {
      const teams = createTeams(12);
      const groups = generateSnakeDraftGroups(teams, 3);

      expect(groups).toHaveLength(3);
      expect(groups.every(g => g.teamIds.length === 4)).toBe(true);
    });

    it('distributes 8 teams into 2 groups correctly', () => {
      const teams = createTeams(8);
      const groups = generateSnakeDraftGroups(teams, 2);

      expect(groups).toHaveLength(2);
      expect(groups[0].teamIds).toHaveLength(4);
      expect(groups[1].teamIds).toHaveLength(4);

      // Group A: 1, 4, 5, 8
      const groupASeeds = groups[0].teamIds.map(id =>
        teams.find(t => t.id === id)?.seedPosition
      );
      expect(groupASeeds).toEqual([1, 4, 5, 8]);
    });
  });

  describe('edge cases - team dropouts', () => {
    it('handles 11 teams with 3 groups (uneven distribution)', () => {
      const teams = createTeams(11);
      const groups = generateSnakeDraftGroups(teams, 3);

      expect(groups).toHaveLength(3);
      const totalTeams = groups.reduce((sum, g) => sum + g.teamIds.length, 0);
      expect(totalTeams).toBe(11);
    });

    it('handles 15 teams with 4 groups (one team short)', () => {
      const teams = createTeams(15);
      const groups = generateSnakeDraftGroups(teams, 4);

      expect(groups).toHaveLength(4);
      const totalTeams = groups.reduce((sum, g) => sum + g.teamIds.length, 0);
      expect(totalTeams).toBe(15);

      // One group should have 3 teams
      const groupSizes = groups.map(g => g.teamIds.length);
      expect(groupSizes.filter(s => s === 3)).toHaveLength(1);
      expect(groupSizes.filter(s => s === 4)).toHaveLength(3);
    });

    it('handles 13 teams with 4 groups (3 teams short)', () => {
      const teams = createTeams(13);
      const groups = generateSnakeDraftGroups(teams, 4);

      expect(groups).toHaveLength(4);
      const totalTeams = groups.reduce((sum, g) => sum + g.teamIds.length, 0);
      expect(totalTeams).toBe(13);
    });
  });

  describe('group naming', () => {
    it('names groups A, B, C, D', () => {
      const teams = createTeams(16);
      const groups = generateSnakeDraftGroups(teams, 4);

      expect(groups[0].name).toBe('Gruppe A');
      expect(groups[1].name).toBe('Gruppe B');
      expect(groups[2].name).toBe('Gruppe C');
      expect(groups[3].name).toBe('Gruppe D');
    });

    it('names up to 8 groups correctly', () => {
      const teams = createTeams(32);
      const groups = generateSnakeDraftGroups(teams, 8);

      expect(groups[4].name).toBe('Gruppe E');
      expect(groups[5].name).toBe('Gruppe F');
      expect(groups[6].name).toBe('Gruppe G');
      expect(groups[7].name).toBe('Gruppe H');
    });
  });
});

describe('generateRandomGroups', () => {
  it('distributes all teams across groups', () => {
    const teams = createTeams(16);
    const groups = generateRandomGroups(teams, 4);

    const allTeamIds = groups.flatMap(g => g.teamIds);
    expect(allTeamIds).toHaveLength(16);

    // All team IDs should be present
    for (const team of teams) {
      expect(allTeamIds).toContain(team.id);
    }
  });

  it('creates groups with correct size', () => {
    const teams = createTeams(12);
    const groups = generateRandomGroups(teams, 3);

    expect(groups).toHaveLength(3);
    expect(groups.every(g => g.teamIds.length === 4)).toBe(true);
  });
});

describe('generateGroups', () => {
  it('uses snake draft when seeding is snake', () => {
    const teams = createTeams(16);
    const groups = generateGroups(teams, 4, 'snake');

    // Check snake pattern
    const groupASeeds = groups[0].teamIds.map(id =>
      teams.find(t => t.id === id)?.seedPosition
    );
    expect(groupASeeds).toEqual([1, 8, 9, 16]);
  });

  it('returns empty groups for manual seeding', () => {
    const teams = createTeams(16);
    const groups = generateGroups(teams, 4, 'manual');

    expect(groups).toHaveLength(4);
    expect(groups.every(g => g.teamIds.length === 0)).toBe(true);
  });
});

describe('generateGroupPhaseMatches', () => {
  function createGroupPhaseConfig(teams: ReturnType<typeof createTeams>, numberOfGroups: number): GroupPhaseConfig {
    const groups = generateSnakeDraftGroups(teams, numberOfGroups);
    return {
      numberOfGroups,
      teamsPerGroup: 4,
      seeding: 'snake',
      groups,
    };
  }

  describe('match count', () => {
    it('generates correct match count for 4 groups (16 teams)', () => {
      const teams = createTeams(16);
      const config = createGroupPhaseConfig(teams, 4);
      const matches = generateGroupPhaseMatches(config, teams, 4);

      expect(matches).toHaveLength(expectedGroupPhaseMatchCount(4)); // 24
    });

    it('generates correct match count for 3 groups (12 teams)', () => {
      const teams = createTeams(12);
      const config = createGroupPhaseConfig(teams, 3);
      const matches = generateGroupPhaseMatches(config, teams, 3);

      expect(matches).toHaveLength(expectedGroupPhaseMatchCount(3)); // 18
    });

    it('generates correct match count for 2 groups (8 teams)', () => {
      const teams = createTeams(8);
      const config = createGroupPhaseConfig(teams, 2);
      const matches = generateGroupPhaseMatches(config, teams, 2);

      expect(matches).toHaveLength(expectedGroupPhaseMatchCount(2)); // 12
    });
  });

  describe('match integrity', () => {
    it('no self-matches', () => {
      const teams = createTeams(16);
      const config = createGroupPhaseConfig(teams, 4);
      const matches = generateGroupPhaseMatches(config, teams, 4);

      const result = verifyNoSelfMatches(matches);
      expect(result.valid).toBe(true);
    });

    it('no duplicate matchups within groups', () => {
      const teams = createTeams(16);
      const config = createGroupPhaseConfig(teams, 4);
      const matches = generateGroupPhaseMatches(config, teams, 4);

      const result = verifyNoDuplicateMatchups(matches);
      expect(result.valid).toBe(true);
    });

    it('all teams participate', () => {
      const teams = createTeams(16);
      const config = createGroupPhaseConfig(teams, 4);
      const matches = generateGroupPhaseMatches(config, teams, 4);

      const result = verifyAllTeamsParticipate(matches, teams);
      expect(result.valid).toBe(true);
    });

    it('each match has groupId assigned', () => {
      const teams = createTeams(16);
      const config = createGroupPhaseConfig(teams, 4);
      const matches = generateGroupPhaseMatches(config, teams, 4);

      expect(matches.every(m => m.groupId !== undefined)).toBe(true);
    });
  });

  describe('interleaving', () => {
    it('interleaves matches from different groups', () => {
      const teams = createTeams(16);
      const config = createGroupPhaseConfig(teams, 4);
      const matches = generateGroupPhaseMatches(config, teams, 4);

      // First 4 matches should be from different groups
      const firstFourGroupIds = matches.slice(0, 4).map(m => m.groupId);
      const uniqueGroups = new Set(firstFourGroupIds);
      expect(uniqueGroups.size).toBe(4);
    });
  });

  describe('edge cases - team dropouts', () => {
    it('handles 15 teams in 4 groups (one group has 3 teams)', () => {
      const teams = createTeams(15);
      const config = createGroupPhaseConfig(teams, 4);
      const matches = generateGroupPhaseMatches(config, teams, 4);

      // 3 groups with 4 teams = 3*6 = 18 matches
      // 1 group with 3 teams = 3 matches
      // Total: 21 matches
      expect(matches).toHaveLength(21);

      const result = verifyAllTeamsParticipate(matches, teams);
      expect(result.valid).toBe(true);
    });

    it('handles 11 teams in 3 groups', () => {
      const teams = createTeams(11);
      const config = createGroupPhaseConfig(teams, 3);
      const matches = generateGroupPhaseMatches(config, teams, 3);

      // Distribution: 4, 4, 3 teams
      // Matches: 6 + 6 + 3 = 15
      expect(matches).toHaveLength(15);

      const result = verifyAllTeamsParticipate(matches, teams);
      expect(result.valid).toBe(true);
    });

    it('handles 9 teams in 3 groups (3 teams per group)', () => {
      const teams = createTeams(9);
      const config = createGroupPhaseConfig(teams, 3);
      const matches = generateGroupPhaseMatches(config, teams, 3);

      // 3 groups * 3 matches = 9 matches
      expect(matches).toHaveLength(9);

      const result = verifyAllTeamsParticipate(matches, teams);
      expect(result.valid).toBe(true);
    });
  });
});

describe('calculateGroupStandings', () => {
  it('calculates correct standings after all matches', () => {
    const teams = createTeams(4);
    const group: Group = {
      id: 'group-1',
      name: 'Gruppe A',
      teamIds: teams.map(t => t.id),
    };

    // Create matches for the group
    const matches: Match[] = [
      {
        id: '1',
        round: 1,
        matchNumber: 1,
        teamAId: teams[0].id,
        teamBId: teams[1].id,
        courtNumber: 1,
        scores: [{ teamA: 21, teamB: 15 }],
        winnerId: teams[0].id,
        status: 'completed',
        groupId: group.id,
      },
      {
        id: '2',
        round: 1,
        matchNumber: 2,
        teamAId: teams[2].id,
        teamBId: teams[3].id,
        courtNumber: 2,
        scores: [{ teamA: 21, teamB: 18 }],
        winnerId: teams[2].id,
        status: 'completed',
        groupId: group.id,
      },
      {
        id: '3',
        round: 2,
        matchNumber: 3,
        teamAId: teams[0].id,
        teamBId: teams[2].id,
        courtNumber: 1,
        scores: [{ teamA: 21, teamB: 19 }],
        winnerId: teams[0].id,
        status: 'completed',
        groupId: group.id,
      },
      {
        id: '4',
        round: 2,
        matchNumber: 4,
        teamAId: teams[1].id,
        teamBId: teams[3].id,
        courtNumber: 2,
        scores: [{ teamA: 21, teamB: 12 }],
        winnerId: teams[1].id,
        status: 'completed',
        groupId: group.id,
      },
      {
        id: '5',
        round: 3,
        matchNumber: 5,
        teamAId: teams[0].id,
        teamBId: teams[3].id,
        courtNumber: 1,
        scores: [{ teamA: 21, teamB: 10 }],
        winnerId: teams[0].id,
        status: 'completed',
        groupId: group.id,
      },
      {
        id: '6',
        round: 3,
        matchNumber: 6,
        teamAId: teams[1].id,
        teamBId: teams[2].id,
        courtNumber: 2,
        scores: [{ teamA: 15, teamB: 21 }],
        winnerId: teams[2].id,
        status: 'completed',
        groupId: group.id,
      },
    ];

    const standings = calculateGroupStandings(
      group.id,
      teams,
      matches,
      1,
      'head-to-head-first'
    );

    // Team 0: 3 wins, 0 losses - 1st place
    // Team 2: 2 wins, 1 loss - 2nd place
    // Team 1: 1 win, 2 losses - 3rd place
    // Team 3: 0 wins, 3 losses - 4th place
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

    // Create mock standings
    const standings = config.groups.flatMap((group) =>
      group.teamIds.map((teamId, index) => ({
        teamId,
        played: 3,
        won: 3 - index,
        lost: index,
        setsWon: 3 - index,
        setsLost: index,
        pointsWon: 63 - index * 10,
        pointsLost: 45 + index * 5,
        points: 3 - index,
        groupId: group.id,
        groupRank: index + 1,
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
    const result = validateGroupConfig(teams, 4, 4);
    expect(result.valid).toBe(true);
  });

  it('rejects too few teams', () => {
    const teams = createTeams(3);
    const result = validateGroupConfig(teams, 4, 4);
    expect(result.valid).toBe(false);
  });

  it('rejects too many teams', () => {
    const teams = createTeams(20);
    const result = validateGroupConfig(teams, 4, 4);
    expect(result.valid).toBe(false);
  });

  it('rejects uneven distribution', () => {
    const teams = createTeams(13);
    const result = validateGroupConfig(teams, 4, 4);
    expect(result.valid).toBe(false);
  });
});

describe('getGroupPhaseMatchCount', () => {
  it('calculates correct count for 4 groups of 4', () => {
    expect(getGroupPhaseMatchCount(4, 4)).toBe(24);
  });

  it('calculates correct count for 3 groups of 4', () => {
    expect(getGroupPhaseMatchCount(3, 4)).toBe(18);
  });

  it('calculates correct count for 2 groups of 4', () => {
    expect(getGroupPhaseMatchCount(2, 4)).toBe(12);
  });

  it('calculates correct count for 6 groups of 4', () => {
    expect(getGroupPhaseMatchCount(6, 4)).toBe(36);
  });
});
