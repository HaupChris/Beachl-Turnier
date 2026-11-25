/**
 * Tests for Round Robin Generator
 *
 * These tests verify that:
 * 1. Polygon method generates correct pairings
 * 2. Match counts are correct for various team sizes
 * 3. Bye handling works for odd team counts
 * 4. Each team plays exactly once per round
 * 5. Court assignments are correct
 *
 * @see docs/tournament-modes-specification.md Section 1.1
 */

import { describe, it, expect } from 'vitest';
import {
  RoundRobinGenerator,
  generateRoundRobinPairings,
  validateRoundRobinPairings,
} from '../RoundRobinGenerator';
import {
  roundRobinMatchCount,
  roundRobinRoundCount,
  assignCourts,
  type TeamInput,
  type GeneratorConfig,
} from '../MatchGenerator';

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
// UTILITY FUNCTION TESTS
// =============================================================================

describe('Utility Functions', () => {
  describe('roundRobinMatchCount', () => {
    it.each([
      [2, 1],
      [3, 3],
      [4, 6],
      [5, 10],
      [6, 15],
      [7, 21],
      [8, 28],
      [10, 45],
      [12, 66],
      [16, 120],
    ])('%d teams → %d matches', (teams, expected) => {
      expect(roundRobinMatchCount(teams)).toBe(expected);
    });
  });

  describe('roundRobinRoundCount', () => {
    it.each([
      [2, 1],    // 2 even → 1 round
      [3, 3],    // 3 odd → 3 rounds (with bye)
      [4, 3],    // 4 even → 3 rounds
      [5, 5],    // 5 odd → 5 rounds (with bye)
      [6, 5],    // 6 even → 5 rounds
      [8, 7],    // 8 even → 7 rounds
      [16, 15],  // 16 even → 15 rounds
    ])('%d teams → %d rounds', (teams, expected) => {
      expect(roundRobinRoundCount(teams)).toBe(expected);
    });
  });

  describe('assignCourts', () => {
    it('assigns courts up to available count', () => {
      const courts = assignCourts(4, 2);
      expect(courts).toEqual([1, 2, null, null]);
    });

    it('assigns all courts when enough available', () => {
      const courts = assignCourts(3, 4);
      expect(courts).toEqual([1, 2, 3]);
    });

    it('starts from specified court number', () => {
      const courts = assignCourts(3, 5, 2);
      expect(courts).toEqual([2, 3, 4]);
    });
  });
});

// =============================================================================
// PAIRING GENERATION TESTS
// =============================================================================

describe('generateRoundRobinPairings', () => {
  describe('match count', () => {
    it.each([2, 3, 4, 5, 6, 7, 8, 10, 12, 16])(
      '%d teams → correct match count',
      (teamCount) => {
        const pairings = generateRoundRobinPairings(teamCount);
        expect(pairings).toHaveLength(roundRobinMatchCount(teamCount));
      }
    );
  });

  describe('validation', () => {
    it.each([2, 3, 4, 5, 6, 7, 8, 10, 12, 16])(
      '%d teams → valid pairings',
      (teamCount) => {
        const pairings = generateRoundRobinPairings(teamCount);
        const result = validateRoundRobinPairings(pairings, teamCount);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    );
  });

  describe('round distribution', () => {
    it('4 teams → 3 rounds', () => {
      const pairings = generateRoundRobinPairings(4);
      const rounds = new Set(pairings.map((p) => p.round));
      expect(rounds.size).toBe(3);
    });

    it('5 teams → 5 rounds (with bye)', () => {
      const pairings = generateRoundRobinPairings(5);
      const rounds = new Set(pairings.map((p) => p.round));
      expect(rounds.size).toBe(5);
    });

    it('8 teams → 7 rounds', () => {
      const pairings = generateRoundRobinPairings(8);
      const rounds = new Set(pairings.map((p) => p.round));
      expect(rounds.size).toBe(7);
    });
  });

  describe('matches per round', () => {
    it('4 teams → 2 matches per round', () => {
      const pairings = generateRoundRobinPairings(4);
      const byRound = groupByRound(pairings);

      for (const [, matches] of byRound) {
        expect(matches.length).toBe(2);
      }
    });

    it('6 teams → 3 matches per round', () => {
      const pairings = generateRoundRobinPairings(6);
      const byRound = groupByRound(pairings);

      for (const [, matches] of byRound) {
        expect(matches.length).toBe(3);
      }
    });

    it('5 teams (odd) → 2 matches per round (1 bye)', () => {
      const pairings = generateRoundRobinPairings(5);
      const byRound = groupByRound(pairings);

      for (const [, matches] of byRound) {
        expect(matches.length).toBe(2);
      }
    });
  });

  describe('each team plays once per round', () => {
    it.each([4, 5, 6, 7, 8])(
      '%d teams → each team plays at most once per round',
      (teamCount) => {
        const pairings = generateRoundRobinPairings(teamCount);
        const byRound = groupByRound(pairings);

        for (const [, matches] of byRound) {
          const teamsInRound = new Set<number>();
          for (const m of matches) {
            expect(teamsInRound.has(m.teamAIndex)).toBe(false);
            expect(teamsInRound.has(m.teamBIndex)).toBe(false);
            teamsInRound.add(m.teamAIndex);
            teamsInRound.add(m.teamBIndex);
          }
        }
      }
    );
  });
});

// =============================================================================
// ROUND ROBIN GENERATOR TESTS
// =============================================================================

describe('RoundRobinGenerator', () => {
  const generator = new RoundRobinGenerator();

  describe('name', () => {
    it('has correct name', () => {
      expect(generator.name).toBe('round-robin');
    });
  });

  describe('getExpectedMatchCount', () => {
    it.each([
      [4, 6],
      [8, 28],
      [12, 66],
    ])('%d teams → %d matches', (teams, expected) => {
      expect(generator.getExpectedMatchCount(teams)).toBe(expected);
    });
  });

  describe('getExpectedRoundCount', () => {
    it.each([
      [4, 3],
      [8, 7],
      [5, 5],
    ])('%d teams → %d rounds', (teams, expected) => {
      expect(generator.getExpectedRoundCount(teams)).toBe(expected);
    });
  });

  describe('generate', () => {
    describe('match count', () => {
      it.each([4, 5, 6, 7, 8, 10, 12])(
        '%d teams → correct match count',
        (teamCount) => {
          const teams = createTeams(teamCount);
          const result = generator.generate(teams, defaultConfig());
          expect(result.matches).toHaveLength(roundRobinMatchCount(teamCount));
        }
      );
    });

    describe('team IDs', () => {
      it('uses correct team IDs', () => {
        const teams = createTeams(4);
        const result = generator.generate(teams, defaultConfig());

        const allTeamIds = new Set<string>();
        for (const match of result.matches) {
          if (match.teamAId) allTeamIds.add(match.teamAId);
          if (match.teamBId) allTeamIds.add(match.teamBId);
        }

        expect(allTeamIds).toEqual(new Set(['team-1', 'team-2', 'team-3', 'team-4']));
      });

      it('does not include bye team ID', () => {
        const teams = createTeams(5);
        const result = generator.generate(teams, defaultConfig());

        for (const match of result.matches) {
          expect(match.teamAId).not.toBe('bye');
          expect(match.teamBId).not.toBe('bye');
        }
      });
    });

    describe('round numbers', () => {
      it('rounds start at 1 by default', () => {
        const teams = createTeams(4);
        const result = generator.generate(teams, defaultConfig());

        const rounds = new Set(result.matches.map((m) => m.round));
        expect(Math.min(...rounds)).toBe(1);
      });

      it('respects startRound config', () => {
        const teams = createTeams(4);
        const result = generator.generate(teams, { courts: 2, startRound: 5 });

        const rounds = new Set(result.matches.map((m) => m.round));
        expect(Math.min(...rounds)).toBe(5);
        expect(Math.max(...rounds)).toBe(7); // 3 rounds: 5, 6, 7
      });
    });

    describe('match numbers', () => {
      it('match numbers start at 1 by default', () => {
        const teams = createTeams(4);
        const result = generator.generate(teams, defaultConfig());

        const matchNumbers = result.matches.map((m) => m.matchNumber);
        expect(Math.min(...matchNumbers)).toBe(1);
      });

      it('match numbers are sequential', () => {
        const teams = createTeams(6);
        const result = generator.generate(teams, defaultConfig());

        const matchNumbers = result.matches.map((m) => m.matchNumber).sort((a, b) => a - b);
        expect(matchNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
      });

      it('respects startMatchNumber config', () => {
        const teams = createTeams(4);
        const result = generator.generate(teams, { courts: 2, startMatchNumber: 10 });

        const matchNumbers = result.matches.map((m) => m.matchNumber);
        expect(Math.min(...matchNumbers)).toBe(10);
        expect(Math.max(...matchNumbers)).toBe(15); // 6 matches: 10-15
      });
    });

    describe('court assignment', () => {
      it('assigns courts within range', () => {
        const teams = createTeams(8);
        const result = generator.generate(teams, { courts: 4 });

        for (const match of result.matches) {
          if (match.courtNumber !== null) {
            expect(match.courtNumber).toBeGreaterThanOrEqual(1);
            expect(match.courtNumber).toBeLessThanOrEqual(4);
          }
        }
      });

      it('assigns null when not enough courts', () => {
        const teams = createTeams(8);
        const result = generator.generate(teams, { courts: 2 });

        // 4 matches per round, 2 courts → 2 matches get null
        const nullCourts = result.matches.filter((m) => m.courtNumber === null);
        expect(nullCourts.length).toBeGreaterThan(0);
      });

      it('assigns all matches when enough courts', () => {
        const teams = createTeams(4);
        const result = generator.generate(teams, { courts: 4 });

        // 2 matches per round, 4 courts → all get assigned
        const nullCourts = result.matches.filter((m) => m.courtNumber === null);
        expect(nullCourts.length).toBe(0);
      });
    });

    describe('result metadata', () => {
      it('returns correct round count', () => {
        const teams = createTeams(8);
        const result = generator.generate(teams, defaultConfig());
        expect(result.rounds).toBe(7);
      });

      it('returns correct matches per round', () => {
        const teams = createTeams(8);
        const result = generator.generate(teams, defaultConfig());
        expect(result.matchesPerRound).toBe(4);
      });

      it('returns correct matches per round for odd teams', () => {
        const teams = createTeams(7);
        const result = generator.generate(teams, defaultConfig());
        expect(result.matchesPerRound).toBe(3); // floor(7/2) = 3
      });
    });

    describe('edge cases', () => {
      it('handles 2 teams (minimum)', () => {
        const teams = createTeams(2);
        const result = generator.generate(teams, defaultConfig());

        expect(result.matches).toHaveLength(1);
        expect(result.rounds).toBe(1);
        expect(result.matches[0].teamAId).toBe('team-1');
        expect(result.matches[0].teamBId).toBe('team-2');
      });

      it('handles empty team list', () => {
        const result = generator.generate([], defaultConfig());

        expect(result.matches).toHaveLength(0);
        expect(result.rounds).toBe(0);
      });

      it('handles single team', () => {
        const teams = createTeams(1);
        const result = generator.generate(teams, defaultConfig());

        expect(result.matches).toHaveLength(0);
        expect(result.rounds).toBe(0);
      });

      it('handles 16 teams (large tournament)', () => {
        const teams = createTeams(16);
        const result = generator.generate(teams, defaultConfig());

        expect(result.matches).toHaveLength(120);
        expect(result.rounds).toBe(15);

        // Verify all teams participate
        const allTeamIds = new Set<string>();
        for (const match of result.matches) {
          if (match.teamAId) allTeamIds.add(match.teamAId);
          if (match.teamBId) allTeamIds.add(match.teamBId);
        }
        expect(allTeamIds.size).toBe(16);
      });
    });
  });
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe('validateRoundRobinPairings', () => {
  it('valid pairings return no errors', () => {
    const pairings = generateRoundRobinPairings(6);
    const result = validateRoundRobinPairings(pairings, 6);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects wrong match count', () => {
    const pairings = generateRoundRobinPairings(6).slice(0, 10);
    const result = validateRoundRobinPairings(pairings, 6);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Expected 15 matches'))).toBe(true);
  });

  it('detects self-matches', () => {
    const pairings = [
      { teamAIndex: 0, teamBIndex: 0, round: 1 },
      { teamAIndex: 0, teamBIndex: 1, round: 1 },
    ];
    const result = validateRoundRobinPairings(pairings, 2);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Self-match'))).toBe(true);
  });

  it('detects duplicate pairings', () => {
    const pairings = [
      { teamAIndex: 0, teamBIndex: 1, round: 1 },
      { teamAIndex: 0, teamBIndex: 1, round: 2 },
    ];
    const result = validateRoundRobinPairings(pairings, 2);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Duplicate'))).toBe(true);
  });

  it('detects team playing multiple times in round', () => {
    const pairings = [
      { teamAIndex: 0, teamBIndex: 1, round: 1 },
      { teamAIndex: 0, teamBIndex: 2, round: 1 },
      { teamAIndex: 1, teamBIndex: 2, round: 2 },
    ];
    const result = validateRoundRobinPairings(pairings, 3);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('plays multiple times'))).toBe(true);
  });
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function groupByRound<T extends { round: number }>(
  pairings: T[]
): Map<number, T[]> {
  const byRound = new Map<number, T[]>();
  for (const p of pairings) {
    if (!byRound.has(p.round)) byRound.set(p.round, []);
    byRound.get(p.round)!.push(p);
  }
  return byRound;
}
