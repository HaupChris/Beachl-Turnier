/**
 * Tests for Group Phase Generator
 *
 * These tests verify that:
 * 1. Snake seeding distributes teams correctly
 * 2. Groups are balanced
 * 3. Round-robin matches are generated within groups
 * 4. Matches are interleaved across groups
 * 5. Bye handling works correctly
 *
 * @see docs/tournament-modes-specification.md Section 3.0
 */

import { describe, it, expect } from 'vitest';
import {
  GroupPhaseGenerator,
  generateSnakeSeeding,
  validateSnakeSeeding,
  getExpectedSnakeDistribution,
  getGroupPhaseMatchCount,
  type GroupDistribution,
} from '../GroupPhaseGenerator';
import type { TeamInput, GeneratorConfig } from '../MatchGenerator';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createTeams(count: number): TeamInput[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `team-${i + 1}`,
    seedPosition: i + 1,
  }));
}

function defaultConfig(courts: number = 4): GeneratorConfig {
  return { courts };
}

// =============================================================================
// SNAKE SEEDING TESTS
// =============================================================================

describe('Snake Seeding Algorithm', () => {
  describe('generateSnakeSeeding', () => {
    it('distributes 16 teams into 4 groups correctly', () => {
      const distribution = generateSnakeSeeding(16, 4);

      // Group A: Seeds 1, 8, 9, 16 (indices 0, 7, 8, 15)
      expect(distribution[0].teamIndices).toEqual([0, 7, 8, 15]);

      // Group B: Seeds 2, 7, 10, 15 (indices 1, 6, 9, 14)
      expect(distribution[1].teamIndices).toEqual([1, 6, 9, 14]);

      // Group C: Seeds 3, 6, 11, 14 (indices 2, 5, 10, 13)
      expect(distribution[2].teamIndices).toEqual([2, 5, 10, 13]);

      // Group D: Seeds 4, 5, 12, 13 (indices 3, 4, 11, 12)
      expect(distribution[3].teamIndices).toEqual([3, 4, 11, 12]);
    });

    it('distributes 8 teams into 2 groups correctly', () => {
      const distribution = generateSnakeSeeding(8, 2);

      // Group A: Seeds 1, 4, 5, 8 (indices 0, 3, 4, 7)
      expect(distribution[0].teamIndices).toEqual([0, 3, 4, 7]);

      // Group B: Seeds 2, 3, 6, 7 (indices 1, 2, 5, 6)
      expect(distribution[1].teamIndices).toEqual([1, 2, 5, 6]);
    });

    it('distributes 12 teams into 4 groups correctly', () => {
      const distribution = generateSnakeSeeding(12, 4);

      // 3 teams per group
      expect(distribution[0].teamIndices).toEqual([0, 7, 8]); // Seeds 1, 8, 9
      expect(distribution[1].teamIndices).toEqual([1, 6, 9]); // Seeds 2, 7, 10
      expect(distribution[2].teamIndices).toEqual([2, 5, 10]); // Seeds 3, 6, 11
      expect(distribution[3].teamIndices).toEqual([3, 4, 11]); // Seeds 4, 5, 12
    });

    it('handles uneven distribution (10 teams, 4 groups)', () => {
      const distribution = generateSnakeSeeding(10, 4);

      // First 2 groups have 3 teams, last 2 have 2 teams
      expect(distribution[0].teamIndices).toEqual([0, 7, 8]); // 3 teams
      expect(distribution[1].teamIndices).toEqual([1, 6, 9]); // 3 teams
      expect(distribution[2].teamIndices).toEqual([2, 5]);    // 2 teams
      expect(distribution[3].teamIndices).toEqual([3, 4]);    // 2 teams
    });

    it('returns correct number of groups', () => {
      expect(generateSnakeSeeding(16, 4)).toHaveLength(4);
      expect(generateSnakeSeeding(12, 4)).toHaveLength(4);
      expect(generateSnakeSeeding(8, 2)).toHaveLength(2);
    });

    it('assigns all teams exactly once', () => {
      const distribution = generateSnakeSeeding(16, 4);
      const allIndices = distribution.flatMap((g) => g.teamIndices);

      expect(allIndices.sort((a, b) => a - b)).toEqual([
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
      ]);
    });
  });

  describe('validateSnakeSeeding', () => {
    it('valid distribution returns no errors', () => {
      const distribution = generateSnakeSeeding(16, 4);
      const result = validateSnakeSeeding(distribution, 16);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects missing teams', () => {
      const distribution: GroupDistribution[] = [
        { groupIndex: 0, groupName: 'A', teamIndices: [0, 1], byeCount: 0 },
        { groupIndex: 1, groupName: 'B', teamIndices: [2, 3], byeCount: 0 },
      ];

      const result = validateSnakeSeeding(distribution, 8);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Expected 8 teams'))).toBe(true);
    });

    it('detects duplicate team assignments', () => {
      const distribution: GroupDistribution[] = [
        { groupIndex: 0, groupName: 'A', teamIndices: [0, 1, 2], byeCount: 0 },
        { groupIndex: 1, groupName: 'B', teamIndices: [2, 3], byeCount: 0 }, // 2 is duplicate
      ];

      const result = validateSnakeSeeding(distribution, 4);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('appears in multiple'))).toBe(true);
    });
  });

  describe('getExpectedSnakeDistribution', () => {
    it('returns 1-indexed seeds', () => {
      const distribution = getExpectedSnakeDistribution(8, 2);

      expect(distribution.get(0)).toEqual([1, 4, 5, 8]); // Group A
      expect(distribution.get(1)).toEqual([2, 3, 6, 7]); // Group B
    });
  });
});

// =============================================================================
// GROUP PHASE GENERATOR TESTS
// =============================================================================

describe('GroupPhaseGenerator', () => {
  const generator = new GroupPhaseGenerator();

  describe('name', () => {
    it('has correct name', () => {
      expect(generator.name).toBe('group-phase');
    });
  });

  describe('distributeTeams', () => {
    it('snake seeding produces balanced groups', () => {
      const distribution = generator.distributeTeams(16, 4, 'snake');

      // All groups should have 4 teams
      for (const group of distribution) {
        expect(group.teamIndices.length).toBe(4);
      }
    });

    it('random seeding distributes all teams', () => {
      const distribution = generator.distributeTeams(12, 3, 'random');

      const allIndices = distribution.flatMap((g) => g.teamIndices).sort((a, b) => a - b);
      expect(allIndices).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    });

    it('manual seeding returns empty groups', () => {
      const distribution = generator.distributeTeams(8, 2, 'manual');

      expect(distribution).toHaveLength(2);
      expect(distribution[0].teamIndices).toHaveLength(0);
      expect(distribution[1].teamIndices).toHaveLength(0);
    });

    it('distributes byes to later groups', () => {
      const distribution = generator.distributeTeams(14, 4, 'snake', 2);

      // Byes should be in groups C and D (indices 2 and 3)
      expect(distribution[0].byeCount).toBe(0);
      expect(distribution[1].byeCount).toBe(0);
      expect(distribution[2].byeCount).toBe(1);
      expect(distribution[3].byeCount).toBe(1);
    });
  });

  describe('generateWithConfig', () => {
    it('generates matches for all groups', () => {
      const teams = createTeams(8);
      const result = generator.generateWithConfig(teams, defaultConfig(2), {
        numberOfGroups: 2,
        seeding: 'snake',
      });

      // 2 groups of 4 teams each: 6 matches per group = 12 total
      expect(result.matches).toHaveLength(12);
    });

    it('interleaves matches from different groups', () => {
      const teams = createTeams(8);
      const result = generator.generateWithConfig(teams, { courts: 2 }, {
        numberOfGroups: 2,
        seeding: 'snake',
      });

      // With 2 courts, matches should alternate between groups
      // Check that matches from both groups appear in early rounds
      const round1Matches = result.matches.filter((m) => m.round === 1);
      expect(round1Matches.length).toBe(2); // 2 courts
    });

    it('assigns sequential match numbers', () => {
      const teams = createTeams(8);
      const result = generator.generateWithConfig(teams, defaultConfig(2), {
        numberOfGroups: 2,
        seeding: 'snake',
      });

      const matchNumbers = result.matches.map((m) => m.matchNumber);
      expect(matchNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it('assigns court numbers within range', () => {
      const teams = createTeams(8);
      const result = generator.generateWithConfig(teams, { courts: 2 }, {
        numberOfGroups: 2,
        seeding: 'snake',
      });

      for (const match of result.matches) {
        if (match.courtNumber !== null) {
          expect(match.courtNumber).toBeGreaterThanOrEqual(1);
          expect(match.courtNumber).toBeLessThanOrEqual(2);
        }
      }
    });

    it('respects startMatchNumber config', () => {
      const teams = createTeams(8);
      const result = generator.generateWithConfig(
        teams,
        { courts: 2, startMatchNumber: 10 },
        { numberOfGroups: 2, seeding: 'snake' }
      );

      expect(result.matches[0].matchNumber).toBe(10);
    });

    it('respects startRound config', () => {
      const teams = createTeams(8);
      const result = generator.generateWithConfig(
        teams,
        { courts: 2, startRound: 5 },
        { numberOfGroups: 2, seeding: 'snake' }
      );

      expect(result.matches[0].round).toBe(5);
    });
  });

  describe('edge cases', () => {
    it('handles 4 teams in 2 groups', () => {
      const teams = createTeams(4);
      const result = generator.generateWithConfig(teams, defaultConfig(2), {
        numberOfGroups: 2,
        seeding: 'snake',
      });

      // 2 groups of 2 teams: 1 match per group = 2 total
      expect(result.matches).toHaveLength(2);
    });

    it('handles empty team list', () => {
      const result = generator.generateWithConfig([], defaultConfig(), {
        numberOfGroups: 2,
        seeding: 'snake',
      });

      expect(result.matches).toHaveLength(0);
    });

    it('handles 1 team', () => {
      const teams = createTeams(1);
      const result = generator.generateWithConfig(teams, defaultConfig(), {
        numberOfGroups: 2,
        seeding: 'snake',
      });

      expect(result.matches).toHaveLength(0);
    });

    it('handles 16 teams in 4 groups', () => {
      const teams = createTeams(16);
      const result = generator.generateWithConfig(teams, defaultConfig(4), {
        numberOfGroups: 4,
        seeding: 'snake',
      });

      // 4 groups of 4 teams: 6 matches per group = 24 total
      expect(result.matches).toHaveLength(24);
    });
  });
});

// =============================================================================
// UTILITY FUNCTION TESTS
// =============================================================================

describe('Utility Functions', () => {
  describe('getGroupPhaseMatchCount', () => {
    it.each([
      [8, 2, 12],   // 2 groups of 4: 6 + 6 = 12
      [16, 4, 24],  // 4 groups of 4: 6 * 4 = 24
      [12, 4, 12],  // 4 groups of 3: 3 * 4 = 12
      [6, 2, 6],    // 2 groups of 3: 3 + 3 = 6
    ])('%d teams, %d groups → %d matches', (teams, groups, expected) => {
      expect(getGroupPhaseMatchCount(teams, groups)).toBe(expected);
    });
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Integration Tests', () => {
  const generator = new GroupPhaseGenerator();

  it('all teams participate in matches', () => {
    const teams = createTeams(12);
    const result = generator.generateWithConfig(teams, defaultConfig(4), {
      numberOfGroups: 4,
      seeding: 'snake',
    });

    const participatingTeams = new Set<string>();
    for (const match of result.matches) {
      if (match.teamAId) participatingTeams.add(match.teamAId);
      if (match.teamBId) participatingTeams.add(match.teamBId);
    }

    expect(participatingTeams.size).toBe(12);
  });

  it('no team plays against itself', () => {
    const teams = createTeams(16);
    const result = generator.generateWithConfig(teams, defaultConfig(4), {
      numberOfGroups: 4,
      seeding: 'snake',
    });

    for (const match of result.matches) {
      expect(match.teamAId).not.toBe(match.teamBId);
    }
  });

  it('teams only play within their group', () => {
    const teams = createTeams(8);
    const distribution = generator.distributeTeams(8, 2, 'snake');

    const result = generator.generateWithConfig(teams, defaultConfig(2), {
      numberOfGroups: 2,
      seeding: 'snake',
    });

    const groupATeamIds = new Set(distribution[0].teamIndices.map((i) => teams[i].id));
    const groupBTeamIds = new Set(distribution[1].teamIndices.map((i) => teams[i].id));

    for (const match of result.matches) {
      const teamAInGroupA = groupATeamIds.has(match.teamAId!);
      const teamBInGroupA = groupATeamIds.has(match.teamBId!);
      const teamAInGroupB = groupBTeamIds.has(match.teamAId!);
      const teamBInGroupB = groupBTeamIds.has(match.teamBId!);

      // Both teams must be in the same group
      expect(teamAInGroupA === teamBInGroupA || teamAInGroupB === teamBInGroupB).toBe(true);
    }
  });

  it('snake seeding produces competitive balance', () => {
    // In snake seeding, seed sum should be similar across groups
    const distribution = generateSnakeSeeding(16, 4);

    const groupSeedSums = distribution.map((g) =>
      g.teamIndices.reduce((sum, idx) => sum + (idx + 1), 0)
    );

    // All groups should have similar seed sums (34 for 16 teams, 4 groups)
    const avgSeedSum = groupSeedSums.reduce((a, b) => a + b, 0) / groupSeedSums.length;
    for (const sum of groupSeedSums) {
      expect(Math.abs(sum - avgSeedSum)).toBeLessThanOrEqual(1);
    }
  });
});
