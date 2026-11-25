/**
 * Tests for Swiss Generator
 *
 * These tests verify that:
 * 1. Round 1 seeding pairs top half vs bottom half
 * 2. Subsequent rounds avoid rematches when possible
 * 3. Teams with same score are paired together
 * 4. Bye handling for odd team counts
 * 5. Recommended round counts
 *
 * @see docs/tournament-modes-specification.md Section 2
 */

import { describe, it, expect } from 'vitest';
import {
  SwissGenerator,
  generateSwissRound1,
  generateSwissNextRound,
  validateSwissPairings,
  getRecommendedSwissRounds,
  getMaxSwissRounds,
  type SwissTeamState,
  type MatchRecord,
} from '../SwissGenerator';
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

function createTeamState(
  index: number,
  matchPoints: number,
  options: Partial<SwissTeamState> = {}
): SwissTeamState {
  return {
    id: `team-${index + 1}`,
    index,
    matchPoints,
    buchholz: 0,
    fineBuchholz: 0,
    setsWon: 0,
    setsLost: 0,
    pointsWon: 0,
    pointsLost: 0,
    hasBye: false,
    ...options,
  };
}

function createMatchRecord(teamAId: string, teamBId: string, winnerId: string | null): MatchRecord {
  return { teamAId, teamBId, winnerId };
}

function defaultConfig(courts: number = 4): GeneratorConfig {
  return { courts };
}

// =============================================================================
// SWISS GENERATOR TESTS
// =============================================================================

describe('SwissGenerator', () => {
  const generator = new SwissGenerator();

  describe('name', () => {
    it('has correct name', () => {
      expect(generator.name).toBe('swiss');
    });
  });

  describe('getExpectedRoundCount', () => {
    it.each([
      [4, 3],   // ceil(log2(4)) + 1 = 2 + 1 = 3
      [5, 4],   // ceil(log2(5)) + 1 = 3 + 1 = 4
      [8, 4],   // ceil(log2(8)) + 1 = 3 + 1 = 4
      [9, 5],   // ceil(log2(9)) + 1 = 4 + 1 = 5
      [16, 5],  // ceil(log2(16)) + 1 = 4 + 1 = 5
      [17, 6],  // ceil(log2(17)) + 1 = 5 + 1 = 6
      [32, 6],  // ceil(log2(32)) + 1 = 5 + 1 = 6
    ])('%d teams → %d recommended rounds', (teams, expected) => {
      expect(generator.getExpectedRoundCount(teams)).toBe(expected);
    });

    it('returns 0 for 0 or 1 teams', () => {
      expect(generator.getExpectedRoundCount(0)).toBe(0);
      expect(generator.getExpectedRoundCount(1)).toBe(0);
    });
  });
});

// =============================================================================
// ROUND 1 SEEDING TESTS
// =============================================================================

describe('Round 1 Seeding', () => {
  describe('generateSwissRound1', () => {
    it('pairs top half vs bottom half for 4 teams', () => {
      const pairings = generateSwissRound1(4);

      expect(pairings).toHaveLength(2);
      expect(pairings[0]).toMatchObject({ teamAIndex: 0, teamBIndex: 2 }); // Seed 1 vs 3
      expect(pairings[1]).toMatchObject({ teamAIndex: 1, teamBIndex: 3 }); // Seed 2 vs 4
    });

    it('pairs top half vs bottom half for 8 teams', () => {
      const pairings = generateSwissRound1(8);

      expect(pairings).toHaveLength(4);
      expect(pairings[0]).toMatchObject({ teamAIndex: 0, teamBIndex: 4 }); // Seed 1 vs 5
      expect(pairings[1]).toMatchObject({ teamAIndex: 1, teamBIndex: 5 }); // Seed 2 vs 6
      expect(pairings[2]).toMatchObject({ teamAIndex: 2, teamBIndex: 6 }); // Seed 3 vs 7
      expect(pairings[3]).toMatchObject({ teamAIndex: 3, teamBIndex: 7 }); // Seed 4 vs 8
    });

    it('handles bye for odd team count', () => {
      const pairings = generateSwissRound1(5);

      expect(pairings).toHaveLength(3); // 2 matches + 1 bye
      expect(pairings[0]).toMatchObject({ teamAIndex: 0, teamBIndex: 2 }); // Seed 1 vs 3
      expect(pairings[1]).toMatchObject({ teamAIndex: 1, teamBIndex: 3 }); // Seed 2 vs 4
      expect(pairings[2]).toMatchObject({ teamAIndex: 4, isBye: true });   // Seed 5 gets bye
    });

    it('handles 7 teams', () => {
      const pairings = generateSwissRound1(7);

      expect(pairings).toHaveLength(4); // 3 matches + 1 bye
      expect(pairings[0]).toMatchObject({ teamAIndex: 0, teamBIndex: 3 }); // Seed 1 vs 4
      expect(pairings[1]).toMatchObject({ teamAIndex: 1, teamBIndex: 4 }); // Seed 2 vs 5
      expect(pairings[2]).toMatchObject({ teamAIndex: 2, teamBIndex: 5 }); // Seed 3 vs 6
      expect(pairings[3]).toMatchObject({ teamAIndex: 6, isBye: true });   // Seed 7 gets bye
    });

    it('returns empty for 0 or 1 teams', () => {
      expect(generateSwissRound1(0)).toHaveLength(0);
      expect(generateSwissRound1(1)).toHaveLength(0);
    });
  });

  describe('generate (Round 1)', () => {
    const generator = new SwissGenerator();

    it('generates matches with correct team IDs', () => {
      const teams = createTeams(4);
      const result = generator.generate(teams, defaultConfig());

      expect(result.matches).toHaveLength(2);
      expect(result.matches[0]).toMatchObject({
        teamAId: 'team-1',
        teamBId: 'team-3',
      });
      expect(result.matches[1]).toMatchObject({
        teamAId: 'team-2',
        teamBId: 'team-4',
      });
    });

    it('excludes bye matches from output', () => {
      const teams = createTeams(5);
      const result = generator.generate(teams, defaultConfig());

      expect(result.matches).toHaveLength(2); // 2 real matches, bye excluded
      for (const match of result.matches) {
        expect(match.teamAId).not.toBeNull();
        expect(match.teamBId).not.toBeNull();
      }
    });

    it('assigns court numbers', () => {
      const teams = createTeams(8);
      const result = generator.generate(teams, { courts: 4 });

      for (const match of result.matches) {
        expect(match.courtNumber).toBeGreaterThanOrEqual(1);
        expect(match.courtNumber).toBeLessThanOrEqual(4);
      }
    });

    it('respects startMatchNumber config', () => {
      const teams = createTeams(4);
      const result = generator.generate(teams, { courts: 2, startMatchNumber: 10 });

      expect(result.matches[0].matchNumber).toBe(10);
      expect(result.matches[1].matchNumber).toBe(11);
    });

    it('respects startRound config', () => {
      const teams = createTeams(4);
      const result = generator.generate(teams, { courts: 2, startRound: 3 });

      expect(result.matches[0].round).toBe(3);
      expect(result.matches[1].round).toBe(3);
    });
  });
});

// =============================================================================
// SUBSEQUENT ROUND TESTS
// =============================================================================

describe('Subsequent Rounds', () => {
  const generator = new SwissGenerator();

  describe('sortByRanking', () => {
    it('sorts by match points first', () => {
      const teams = [
        createTeamState(0, 1),
        createTeamState(1, 2),
        createTeamState(2, 0),
      ];

      const sorted = generator.sortByRanking(teams);

      expect(sorted[0].matchPoints).toBe(2);
      expect(sorted[1].matchPoints).toBe(1);
      expect(sorted[2].matchPoints).toBe(0);
    });

    it('uses Buchholz as tiebreaker', () => {
      const teams = [
        createTeamState(0, 1, { buchholz: 2 }),
        createTeamState(1, 1, { buchholz: 5 }),
        createTeamState(2, 1, { buchholz: 3 }),
      ];

      const sorted = generator.sortByRanking(teams);

      expect(sorted[0].buchholz).toBe(5);
      expect(sorted[1].buchholz).toBe(3);
      expect(sorted[2].buchholz).toBe(2);
    });

    it('uses Fine-Buchholz as secondary tiebreaker', () => {
      const teams = [
        createTeamState(0, 1, { buchholz: 3, fineBuchholz: 5 }),
        createTeamState(1, 1, { buchholz: 3, fineBuchholz: 8 }),
        createTeamState(2, 1, { buchholz: 3, fineBuchholz: 6 }),
      ];

      const sorted = generator.sortByRanking(teams);

      expect(sorted[0].fineBuchholz).toBe(8);
      expect(sorted[1].fineBuchholz).toBe(6);
      expect(sorted[2].fineBuchholz).toBe(5);
    });
  });

  describe('groupByMatchPoints', () => {
    it('groups teams by score', () => {
      const teams = [
        createTeamState(0, 2),
        createTeamState(1, 1),
        createTeamState(2, 2),
        createTeamState(3, 0),
        createTeamState(4, 1),
      ];

      const groups = generator.groupByMatchPoints(teams);

      expect(groups.get(2)?.length).toBe(2);
      expect(groups.get(1)?.length).toBe(2);
      expect(groups.get(0)?.length).toBe(1);
    });
  });

  describe('hasPlayedBefore', () => {
    it('returns true for previous match', () => {
      const history = [createMatchRecord('team-1', 'team-2', 'team-1')];

      expect(generator.hasPlayedBefore('team-1', 'team-2', history)).toBe(true);
      expect(generator.hasPlayedBefore('team-2', 'team-1', history)).toBe(true);
    });

    it('returns false for no previous match', () => {
      const history = [createMatchRecord('team-1', 'team-2', 'team-1')];

      expect(generator.hasPlayedBefore('team-1', 'team-3', history)).toBe(false);
    });

    it('returns false for empty history', () => {
      expect(generator.hasPlayedBefore('team-1', 'team-2', [])).toBe(false);
    });
  });

  describe('generateSubsequentRoundPairings', () => {
    it('pairs teams with same score', () => {
      // After Round 1: 2 winners (2 pts), 2 losers (0 pts)
      const standings = [
        createTeamState(0, 1), // T1 beat T3
        createTeamState(1, 1), // T2 beat T4
        createTeamState(2, 0), // T3 lost to T1
        createTeamState(3, 0), // T4 lost to T2
      ];

      const history = [
        createMatchRecord('team-1', 'team-3', 'team-1'),
        createMatchRecord('team-2', 'team-4', 'team-2'),
      ];

      const pairings = generateSwissNextRound(standings, history);

      // Winners should play each other, losers should play each other
      expect(pairings.length).toBe(2);

      // Find winner pairing (T1 vs T2)
      const winnerPairing = pairings.find(
        (p) =>
          (p.teamAIndex === 0 && p.teamBIndex === 1) ||
          (p.teamAIndex === 1 && p.teamBIndex === 0)
      );
      expect(winnerPairing).toBeDefined();

      // Find loser pairing (T3 vs T4)
      const loserPairing = pairings.find(
        (p) =>
          (p.teamAIndex === 2 && p.teamBIndex === 3) ||
          (p.teamAIndex === 3 && p.teamBIndex === 2)
      );
      expect(loserPairing).toBeDefined();
    });

    it('avoids rematches', () => {
      // 4 teams, after Round 1 where T1 beat T2, T3 beat T4
      const standings = [
        createTeamState(0, 1),
        createTeamState(1, 0),
        createTeamState(2, 1),
        createTeamState(3, 0),
      ];

      const history = [
        createMatchRecord('team-1', 'team-2', 'team-1'),
        createMatchRecord('team-3', 'team-4', 'team-3'),
      ];

      const pairings = generateSwissNextRound(standings, history);

      // Should avoid T1 vs T2 and T3 vs T4
      for (const pairing of pairings) {
        if (pairing.isBye) continue;
        expect(generator.hasPlayedBefore(
          `team-${pairing.teamAIndex + 1}`,
          `team-${pairing.teamBIndex + 1}`,
          history
        )).toBe(false);
      }
    });

    it('handles bye for odd team count', () => {
      const standings = [
        createTeamState(0, 1),
        createTeamState(1, 1),
        createTeamState(2, 0),
      ];

      const history = [
        createMatchRecord('team-1', 'team-3', 'team-1'),
        // team-2 had bye in round 1
      ];

      const pairings = generateSwissNextRound(standings, history);

      // 1 match + 1 bye
      expect(pairings.filter((p) => !p.isBye).length).toBe(1);
      expect(pairings.filter((p) => p.isBye).length).toBe(1);
    });
  });
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe('validateSwissPairings', () => {
  it('valid pairings return no errors', () => {
    const pairings = generateSwissRound1(4);
    const teams = [
      { id: 'team-1', index: 0 },
      { id: 'team-2', index: 1 },
      { id: 'team-3', index: 2 },
      { id: 'team-4', index: 3 },
    ];
    const history: MatchRecord[] = [];

    const result = validateSwissPairings(pairings, history, teams);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects rematches', () => {
    const pairings = [
      { teamAIndex: 0, teamBIndex: 1, isBye: false },
    ];
    const teams = [
      { id: 'team-1', index: 0 },
      { id: 'team-2', index: 1 },
    ];
    const history = [createMatchRecord('team-1', 'team-2', 'team-1')];

    const result = validateSwissPairings(pairings, history, teams);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Rematch'))).toBe(true);
  });

  it('ignores bye pairings', () => {
    const pairings = [
      { teamAIndex: 0, teamBIndex: -1, isBye: true },
    ];
    const teams = [{ id: 'team-1', index: 0 }];
    const history: MatchRecord[] = [];

    const result = validateSwissPairings(pairings, history, teams);

    expect(result.valid).toBe(true);
  });
});

// =============================================================================
// UTILITY FUNCTION TESTS
// =============================================================================

describe('Utility Functions', () => {
  describe('getRecommendedSwissRounds', () => {
    it.each([
      [4, 3],
      [8, 4],
      [16, 5],
      [32, 6],
    ])('%d teams → %d recommended rounds', (teams, expected) => {
      expect(getRecommendedSwissRounds(teams)).toBe(expected);
    });
  });

  describe('getMaxSwissRounds', () => {
    it.each([
      [4, 3],
      [8, 7],
      [16, 15],
    ])('%d teams → %d max rounds', (teams, expected) => {
      expect(getMaxSwissRounds(teams)).toBe(expected);
    });
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe('Edge Cases', () => {
  const generator = new SwissGenerator();

  it('handles 2 teams (minimum)', () => {
    const teams = createTeams(2);
    const result = generator.generate(teams, defaultConfig());

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].teamAId).toBe('team-1');
    expect(result.matches[0].teamBId).toBe('team-2');
  });

  it('handles empty team list', () => {
    const result = generator.generate([], defaultConfig());

    expect(result.matches).toHaveLength(0);
  });

  it('handles 16 teams', () => {
    const teams = createTeams(16);
    const result = generator.generate(teams, defaultConfig());

    // Round 1: 8 matches
    expect(result.matches).toHaveLength(8);

    // All teams participate
    const allTeamIds = new Set<string>();
    for (const match of result.matches) {
      if (match.teamAId) allTeamIds.add(match.teamAId);
      if (match.teamBId) allTeamIds.add(match.teamBId);
    }
    expect(allTeamIds.size).toBe(16);
  });

  it('handles 3 teams (smallest odd)', () => {
    const teams = createTeams(3);
    const result = generator.generate(teams, defaultConfig());

    // 1 match (team-1 vs team-2), team-3 gets bye
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].teamAId).toBe('team-1');
    expect(result.matches[0].teamBId).toBe('team-2');
  });
});
