import { describe, it, expect } from 'vitest';
import {
  generateSnakeDraftGroups,
  generateRandomGroups,
  generateGroups,
  generateGroupPhaseMatches,
} from '../groupPhase';
import {
  createTeams,
  verifyNoSelfMatches,
  verifyNoDuplicateMatchups,
  verifyAllTeamsParticipate,
} from '../../__tests__/utils/testHelpers';
import type { GroupPhaseConfig } from '../../types/tournament';

describe('generateSnakeDraftGroups', () => {
  describe('team distribution', () => {
    it('distributes 16 teams into 4 groups correctly', () => {
      const teams = createTeams(16);
      const groups = generateSnakeDraftGroups(teams, 4);
      expect(groups).toHaveLength(4);
      expect(groups.every(g => g.teamIds.length === 4)).toBe(true);
    });

    it('follows snake draft pattern for 16 teams', () => {
      const teams = createTeams(16);
      const groups = generateSnakeDraftGroups(teams, 4);
      // Group A: seeds 1, 8, 9, 16
      const groupASeeds = groups[0].teamIds.map(id => teams.find(t => t.id === id)?.seedPosition);
      expect(groupASeeds).toEqual([1, 8, 9, 16]);
      // Group B: seeds 2, 7, 10, 15
      const groupBSeeds = groups[1].teamIds.map(id => teams.find(t => t.id === id)?.seedPosition);
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
      // Group A: 1, 4, 5, 8
      const groupASeeds = groups[0].teamIds.map(id => teams.find(t => t.id === id)?.seedPosition);
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
      const groupSizes = groups.map(g => g.teamIds.length);
      expect(groupSizes.filter(s => s === 3)).toHaveLength(1);
      expect(groupSizes.filter(s => s === 4)).toHaveLength(3);
    });

    it('handles 13 teams with 4 groups (3 teams short)', () => {
      const teams = createTeams(13);
      const groups = generateSnakeDraftGroups(teams, 4);
      const totalTeams = groups.reduce((sum, g) => sum + g.teamIds.length, 0);
      expect(totalTeams).toBe(13);
    });
  });

  describe('group naming', () => {
    it('names groups A, B, C, D', () => {
      const teams = createTeams(16);
      const groups = generateSnakeDraftGroups(teams, 4);
      expect(groups.map(g => g.name)).toEqual(['Gruppe A', 'Gruppe B', 'Gruppe C', 'Gruppe D']);
    });

    it('names up to 8 groups correctly', () => {
      const teams = createTeams(32);
      const groups = generateSnakeDraftGroups(teams, 8);
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
    const groupASeeds = groups[0].teamIds.map(id => teams.find(t => t.id === id)?.seedPosition);
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
    return { numberOfGroups, teamsPerGroup: 4, seeding: 'snake', groups };
  }

  describe('match count', () => {
    it.each([
      [16, 4, 24], [12, 3, 18], [8, 2, 12],
    ])('generates correct count for %i teams in %i groups (%i matches)', (teamCount, groupCount, expected) => {
      const teams = createTeams(teamCount);
      const config = createGroupPhaseConfig(teams, groupCount);
      const matches = generateGroupPhaseMatches(config, teams, groupCount);
      expect(matches).toHaveLength(expected);
    });
  });

  describe('match integrity', () => {
    it('no self-matches', () => {
      const teams = createTeams(16);
      const matches = generateGroupPhaseMatches(createGroupPhaseConfig(teams, 4), teams, 4);
      expect(verifyNoSelfMatches(matches).valid).toBe(true);
    });

    it('no duplicate matchups within groups', () => {
      const teams = createTeams(16);
      const matches = generateGroupPhaseMatches(createGroupPhaseConfig(teams, 4), teams, 4);
      expect(verifyNoDuplicateMatchups(matches).valid).toBe(true);
    });

    it('all teams participate', () => {
      const teams = createTeams(16);
      const matches = generateGroupPhaseMatches(createGroupPhaseConfig(teams, 4), teams, 4);
      expect(verifyAllTeamsParticipate(matches, teams).valid).toBe(true);
    });

    it('each match has groupId assigned', () => {
      const teams = createTeams(16);
      const matches = generateGroupPhaseMatches(createGroupPhaseConfig(teams, 4), teams, 4);
      expect(matches.every(m => m.groupId !== undefined)).toBe(true);
    });
  });

  describe('interleaving', () => {
    it('interleaves matches from different groups', () => {
      const teams = createTeams(16);
      const matches = generateGroupPhaseMatches(createGroupPhaseConfig(teams, 4), teams, 4);
      const firstFourGroupIds = new Set(matches.slice(0, 4).map(m => m.groupId));
      expect(firstFourGroupIds.size).toBe(4);
    });
  });

  describe('edge cases - team dropouts', () => {
    it('handles 15 teams in 4 groups (21 matches)', () => {
      const teams = createTeams(15);
      const config = createGroupPhaseConfig(teams, 4);
      const matches = generateGroupPhaseMatches(config, teams, 4);
      expect(matches).toHaveLength(21);
      expect(verifyAllTeamsParticipate(matches, teams).valid).toBe(true);
    });

    it('handles 11 teams in 3 groups (15 matches)', () => {
      const teams = createTeams(11);
      const config = createGroupPhaseConfig(teams, 3);
      const matches = generateGroupPhaseMatches(config, teams, 3);
      expect(matches).toHaveLength(15);
    });

    it('handles 9 teams in 3 groups (9 matches)', () => {
      const teams = createTeams(9);
      const config = createGroupPhaseConfig(teams, 3);
      const matches = generateGroupPhaseMatches(config, teams, 3);
      expect(matches).toHaveLength(9);
    });
  });
});
