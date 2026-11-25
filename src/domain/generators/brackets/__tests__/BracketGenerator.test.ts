/**
 * Tests for Bracket Generator Interface and PlacementTreeGenerator
 *
 * These tests verify that:
 * 1. Bracket utility functions work correctly
 * 2. PlacementTreeGenerator creates valid bracket structures
 * 3. Match dependencies are correctly linked
 * 4. All placements are determined
 *
 * @see docs/tournament-modes-specification.md Section 3A
 */

import { describe, it, expect } from 'vitest';
import {
  bracketRoundCount,
  bracketSize,
  bracketByes,
  createSeedPairings,
  isByePosition,
  type BracketTeamSeed,
  type BracketConfig,
} from '../BracketGenerator';
import {
  PlacementTreeGenerator,
  generatePlacementTreeBracket,
  validatePlacementTreeBracket,
} from '../PlacementTreeGenerator';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createTeamSeeds(count: number): BracketTeamSeed[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `team-${i + 1}`,
    seed: i + 1,
  }));
}

function defaultConfig(courts: number = 4): BracketConfig {
  return { courts };
}

// =============================================================================
// UTILITY FUNCTION TESTS
// =============================================================================

describe('Bracket Utility Functions', () => {
  describe('bracketRoundCount', () => {
    it.each([
      [2, 1],
      [3, 2],
      [4, 2],
      [5, 3],
      [8, 3],
      [9, 4],
      [16, 4],
      [17, 5],
      [32, 5],
    ])('%d teams → %d rounds', (teams, expected) => {
      expect(bracketRoundCount(teams)).toBe(expected);
    });

    it('returns 0 for 0 or 1 teams', () => {
      expect(bracketRoundCount(0)).toBe(0);
      expect(bracketRoundCount(1)).toBe(0);
    });
  });

  describe('bracketSize', () => {
    it.each([
      [2, 2],
      [3, 4],
      [4, 4],
      [5, 8],
      [6, 8],
      [7, 8],
      [8, 8],
      [9, 16],
      [16, 16],
      [17, 32],
    ])('%d teams → bracket size %d', (teams, expected) => {
      expect(bracketSize(teams)).toBe(expected);
    });
  });

  describe('bracketByes', () => {
    it.each([
      [2, 0],
      [3, 1],
      [4, 0],
      [5, 3],
      [6, 2],
      [7, 1],
      [8, 0],
      [9, 7],
      [12, 4],
      [16, 0],
    ])('%d teams → %d byes', (teams, expected) => {
      expect(bracketByes(teams)).toBe(expected);
    });
  });

  describe('createSeedPairings', () => {
    it('creates correct pairings for 4 teams', () => {
      const pairings = createSeedPairings(4);

      expect(pairings).toEqual([
        [0, 3], // Seed 1 vs Seed 4
        [1, 2], // Seed 2 vs Seed 3
      ]);
    });

    it('creates correct pairings for 8 teams', () => {
      const pairings = createSeedPairings(8);

      expect(pairings).toEqual([
        [0, 7], // 1 vs 8
        [1, 6], // 2 vs 7
        [2, 5], // 3 vs 6
        [3, 4], // 4 vs 5
      ]);
    });

    it('creates pairings with byes for non-power-of-2', () => {
      const pairings = createSeedPairings(6);

      // Bracket size is 8, so indices 6 and 7 are byes
      expect(pairings).toHaveLength(4);
      expect(pairings[0]).toEqual([0, 7]); // 1 vs bye
      expect(pairings[1]).toEqual([1, 6]); // 2 vs bye
    });
  });

  describe('isByePosition', () => {
    it('returns false for valid team positions', () => {
      expect(isByePosition(0, 4)).toBe(false);
      expect(isByePosition(3, 4)).toBe(false);
    });

    it('returns true for bye positions', () => {
      expect(isByePosition(4, 4)).toBe(true);
      expect(isByePosition(5, 4)).toBe(true);
    });
  });
});

// =============================================================================
// PLACEMENT TREE GENERATOR TESTS
// =============================================================================

describe('PlacementTreeGenerator', () => {
  const generator = new PlacementTreeGenerator();

  describe('name', () => {
    it('has correct name', () => {
      expect(generator.name).toBe('placement-tree');
    });
  });

  describe('getExpectedRoundCount', () => {
    it.each([
      [4, 2],
      [8, 3],
      [16, 4],
    ])('%d teams → %d rounds', (teams, expected) => {
      expect(generator.getExpectedRoundCount(teams)).toBe(expected);
    });
  });

  describe('generate', () => {
    describe('round 1 matches', () => {
      it('creates correct pairings for 4 teams', () => {
        const teams = createTeamSeeds(4);
        const result = generator.generate(teams, defaultConfig());

        const round1 = result.matches.filter((m) => m.round === 1);
        expect(round1).toHaveLength(2);

        // Seed 1 vs Seed 4
        expect(round1[0].teamAId).toBe('team-1');
        expect(round1[0].teamBId).toBe('team-4');

        // Seed 2 vs Seed 3
        expect(round1[1].teamAId).toBe('team-2');
        expect(round1[1].teamBId).toBe('team-3');
      });

      it('creates correct pairings for 8 teams', () => {
        const teams = createTeamSeeds(8);
        const result = generator.generate(teams, defaultConfig());

        const round1 = result.matches.filter((m) => m.round === 1);
        expect(round1).toHaveLength(4);

        expect(round1[0]).toMatchObject({ teamAId: 'team-1', teamBId: 'team-8' });
        expect(round1[1]).toMatchObject({ teamAId: 'team-2', teamBId: 'team-7' });
        expect(round1[2]).toMatchObject({ teamAId: 'team-3', teamBId: 'team-6' });
        expect(round1[3]).toMatchObject({ teamAId: 'team-4', teamBId: 'team-5' });
      });
    });

    describe('placement intervals', () => {
      it('round 1 matches cover all placements', () => {
        const teams = createTeamSeeds(8);
        const result = generator.generate(teams, defaultConfig());

        const round1 = result.matches.filter((m) => m.round === 1);
        for (const match of round1) {
          expect(match.placementInterval).toEqual({ start: 1, end: 8 });
        }
      });

      it('round 1 splits into winner and loser intervals', () => {
        const teams = createTeamSeeds(8);
        const result = generator.generate(teams, defaultConfig());

        const round1 = result.matches.filter((m) => m.round === 1);
        for (const match of round1) {
          expect(match.winnerInterval).toEqual({ start: 1, end: 4 });
          expect(match.loserInterval).toEqual({ start: 5, end: 8 });
        }
      });

      it('final matches have null intervals', () => {
        const teams = createTeamSeeds(4);
        const result = generator.generate(teams, defaultConfig());

        const finalMatches = result.matches.filter((m) => m.playoffForPlace !== undefined);
        for (const match of finalMatches) {
          expect(match.winnerInterval).toBeNull();
          expect(match.loserInterval).toBeNull();
        }
      });
    });

    describe('dependencies', () => {
      it('subsequent round matches have dependencies', () => {
        const teams = createTeamSeeds(4);
        const result = generator.generate(teams, defaultConfig());

        const round2 = result.matches.filter((m) => m.round === 2);
        for (const match of round2) {
          expect(match.dependsOn).toBeDefined();
          expect(match.dependsOn?.teamA).toBeDefined();
          expect(match.dependsOn?.teamB).toBeDefined();
        }
      });

      it('dependencies reference valid match IDs', () => {
        const teams = createTeamSeeds(8);
        const result = generator.generate(teams, defaultConfig());

        const matchIds = new Set(result.matches.map((m) => m.id));
        for (const match of result.matches) {
          if (match.dependsOn?.teamA) {
            expect(matchIds.has(match.dependsOn.teamA.matchId)).toBe(true);
          }
          if (match.dependsOn?.teamB) {
            expect(matchIds.has(match.dependsOn.teamB.matchId)).toBe(true);
          }
        }
      });
    });

    describe('match routing', () => {
      it('non-final matches have winner routing', () => {
        const teams = createTeamSeeds(4);
        const result = generator.generate(teams, defaultConfig());

        const round1 = result.matches.filter((m) => m.round === 1);
        for (const match of round1) {
          expect(match.winnerGoesTo).not.toBeNull();
        }
      });

      it('non-final matches have loser routing', () => {
        const teams = createTeamSeeds(4);
        const result = generator.generate(teams, defaultConfig());

        const round1 = result.matches.filter((m) => m.round === 1);
        for (const match of round1) {
          expect(match.loserGoesTo).not.toBeNull();
        }
      });
    });

    describe('finals', () => {
      it('4 teams produces 2 finals (1st/2nd and 3rd/4th)', () => {
        const teams = createTeamSeeds(4);
        const result = generator.generate(teams, defaultConfig());

        const finals = result.matches.filter((m) => m.playoffForPlace !== undefined);
        expect(finals).toHaveLength(2);

        const places = finals.map((m) => m.playoffForPlace);
        expect(places).toContain(1); // Final for 1st/2nd
        expect(places).toContain(3); // Final for 3rd/4th
      });

      it('8 teams produces 4 finals', () => {
        const teams = createTeamSeeds(8);
        const result = generator.generate(teams, defaultConfig());

        const finals = result.matches.filter((m) => m.playoffForPlace !== undefined);
        expect(finals).toHaveLength(4);

        const places = finals.map((m) => m.playoffForPlace);
        expect(places).toContain(1); // 1st/2nd
        expect(places).toContain(3); // 3rd/4th
        expect(places).toContain(5); // 5th/6th
        expect(places).toContain(7); // 7th/8th
      });
    });

    describe('court assignment', () => {
      it('assigns courts within range', () => {
        const teams = createTeamSeeds(8);
        const result = generator.generate(teams, { courts: 2 });

        for (const match of result.matches) {
          if (match.courtNumber !== null) {
            expect(match.courtNumber).toBeGreaterThanOrEqual(1);
            expect(match.courtNumber).toBeLessThanOrEqual(2);
          }
        }
      });
    });

    describe('config options', () => {
      it('respects startMatchNumber', () => {
        const teams = createTeamSeeds(4);
        const result = generator.generate(teams, { courts: 2, startMatchNumber: 10 });

        expect(result.matches[0].matchNumber).toBe(10);
      });

      it('respects startRound', () => {
        const teams = createTeamSeeds(4);
        const result = generator.generate(teams, { courts: 2, startRound: 5 });

        expect(result.matches[0].round).toBe(5);
      });
    });

    describe('edge cases', () => {
      it('handles 2 teams (minimum)', () => {
        const teams = createTeamSeeds(2);
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

      it('handles 1 team', () => {
        const teams = createTeamSeeds(1);
        const result = generator.generate(teams, defaultConfig());

        expect(result.matches).toHaveLength(0);
      });
    });
  });
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe('validatePlacementTreeBracket', () => {
  it('valid bracket returns no errors', () => {
    const result = generatePlacementTreeBracket(8, defaultConfig());
    const validation = validatePlacementTreeBracket(result.matches, 8);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('validates team assignments', () => {
    const result = generatePlacementTreeBracket(4, defaultConfig());
    const validation = validatePlacementTreeBracket(result.matches, 4);

    expect(validation.valid).toBe(true);
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Integration Tests', () => {
  it('all teams can reach all placements through the tree', () => {
    const teams = createTeamSeeds(8);
    const generator = new PlacementTreeGenerator();
    const result = generator.generate(teams, defaultConfig());

    // Check that bracket covers all placement intervals
    const coveredIntervals = new Set<string>();
    for (const match of result.matches) {
      coveredIntervals.add(`${match.placementInterval.start}-${match.placementInterval.end}`);
    }

    // Should cover 1-8, 1-4, 5-8, 1-2, 3-4, 5-6, 7-8
    expect(coveredIntervals.has('1-8')).toBe(true);
    expect(coveredIntervals.has('1-4')).toBe(true);
    expect(coveredIntervals.has('5-8')).toBe(true);
  });

  it('dependency chain forms valid tournament structure', () => {
    const teams = createTeamSeeds(8);
    const generator = new PlacementTreeGenerator();
    const result = generator.generate(teams, defaultConfig());

    // Round 1 matches should have no dependencies
    const round1 = result.matches.filter((m) => m.round === 1);
    for (const match of round1) {
      expect(match.dependsOn).toBeUndefined();
    }

    // Final matches should have dependencies
    const finals = result.matches.filter((m) => m.playoffForPlace !== undefined);
    for (const match of finals) {
      expect(match.dependsOn).toBeDefined();
    }
  });
});
